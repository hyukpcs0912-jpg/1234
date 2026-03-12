import { GoogleGenAI } from "@google/genai";
import { AGENT_N_PROMPT_TEMPLATE } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface BlogPostParams {
  postType: string;
  topic: string;
  targetPersona: string;
  cta: string;
  keyInfo: string;
  tone: string;
  evidenceAssets: string;
  existingContent?: string;
  images: string[]; // Base64 strings
}

export async function generateBlogPost(params: BlogPostParams): Promise<{ html: string; report: string; prompts: string[]; hashtags: string }> {
  const { postType, topic, targetPersona, cta, keyInfo, tone, evidenceAssets, existingContent, images } = params;

  // Replace placeholders in the prompt template
  let prompt = AGENT_N_PROMPT_TEMPLATE
    .replace(/{POST_TYPE}/g, postType)
    .replace(/{TOPIC}/g, topic)
    .replace(/{TARGET_PERSONA}/g, targetPersona)
    .replace(/{CTA}/g, cta)
    .replace(/{KEY_INFO}/g, keyInfo)
    .replace(/{TONE}/g, tone)
    .replace(/{EVIDENCE_ASSETS}/g, evidenceAssets)
    .replace(/{EXISTING_CONTENT}/g, existingContent || "(없음 - 신규 생성)");

  // Extract URLs from keyInfo and existingContent
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const keyInfoUrls = keyInfo.match(urlRegex) || [];
  const existingContentUrls = (existingContent || "").match(urlRegex) || [];
  const urls = [...new Set([...keyInfoUrls, ...existingContentUrls])];
  
  const parts: any[] = [{ text: prompt }];

  // Add images to the prompt
  for (const base64Image of images) {
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    });
  }

  try {
    const config: any = {};
    if (urls.length > 0) {
      config.tools = [{ urlContext: {} }];
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: {
        parts: parts,
      },
      config: config
    });

    const text = response.text || "";
    
    // Extract HTML, Report, Prompts, and Hashtags sections
    const htmlMatch = text.match(/\[HTML_START\]([\s\S]*?)\[HTML_END\]/);
    const reportMatch = text.match(/\[REPORT_START\]([\s\S]*?)\[REPORT_END\]/);
    const promptsMatch = text.match(/\[PROMPTS_START\]([\s\S]*?)\[PROMPTS_END\]/);
    const hashtagsMatch = text.match(/\[HASHTAGS_START\]([\s\S]*?)\[HASHTAGS_END\]/);

    const html = htmlMatch ? htmlMatch[1].trim() : "";
    const report = reportMatch ? reportMatch[1].trim() : text; // Fallback to full text if markers missing
    const hashtags = hashtagsMatch ? hashtagsMatch[1].trim() : "";
    
    let prompts: string[] = [];
    if (promptsMatch) {
      prompts = promptsMatch[1]
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0 && !p.startsWith('['));
    }

    return { html, report, prompts, hashtags };

  } catch (error) {
    console.error("Error generating blog post:", error);
    throw new Error("Failed to generate blog post. Please try again.");
  }
}

export async function generateImage(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image.");
  }
}
