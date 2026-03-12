import { GoogleGenAI } from "@google/genai";
import { AGENT_N_PROMPT_TEMPLATE } from "../constants";

export interface BlogPostParams {
  postType: string;
  topic: string;
  targetPersona: string;
  cta: string;
  keyInfo: string;
  tone: string;
  evidenceAssets: string;
  existingContent?: string;
  images: string[];
}

export async function generateBlogPost(params: BlogPostParams, apiKey: string): Promise<{ html: string; report: string; prompts: string[]; hashtags: string }> {
  // 키가 없으면 에러를 던져서 앱 중단을 방지
  if (!apiKey) throw new Error("API 키가 입력되지 않았습니다.");

  const { postType, topic, targetPersona, cta, keyInfo, tone, evidenceAssets, existingContent, images } = params;
  
  // 호출되는 시점에 인스턴스 생성
  const ai = new GoogleGenAI({ apiKey });

  let prompt = AGENT_N_PROMPT_TEMPLATE
    .replace(/{POST_TYPE}/g, postType)
    .replace(/{TOPIC}/g, topic)
    .replace(/{TARGET_PERSONA}/g, targetPersona)
    .replace(/{CTA}/g, cta)
    .replace(/{KEY_INFO}/g, keyInfo)
    .replace(/{TONE}/g, tone)
    .replace(/{EVIDENCE_ASSETS}/g, evidenceAssets)
    .replace(/{EXISTING_CONTENT}/g, existingContent || "(없음 - 신규 생성)");

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const keyInfoUrls = keyInfo.match(urlRegex) || [];
  const existingContentUrls = (existingContent || "").match(urlRegex) || [];
  const urls = [...new Set([...keyInfoUrls, ...existingContentUrls])];
  
  const parts: any[] = [{ text: prompt }];

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
      model: "gemini-3-flash-preview", // 최신 권장 모델로 업데이트
      contents: [{ role: "user", parts: parts }],
      config: config
    });

    const text = response.text || "";
    
    const htmlMatch = text.match(/\[HTML_START\]([\s\S]*?)\[HTML_END\]/);
    const reportMatch = text.match(/\[REPORT_START\]([\s\S]*?)\[REPORT_END\]/);
    const promptsMatch = text.match(/\[PROMPTS_START\]([\s\S]*?)\[PROMPTS_END\]/);
    const hashtagsMatch = text.match(/\[HASHTAGS_START\]([\s\S]*?)\[HASHTAGS_END\]/);

    return { 
      html: htmlMatch ? htmlMatch[1].trim() : "", 
      report: reportMatch ? reportMatch[1].trim() : text, 
      prompts: promptsMatch ? promptsMatch[1].split('\n').map(p => p.trim()).filter(p => p.length > 0 && !p.startsWith('[')) : [], 
      hashtags: hashtagsMatch ? hashtagsMatch[1].trim() : "" 
    };
  } catch (error) {
    console.error("Error generating blog post:", error);
    throw new Error("API 키가 올바르지 않거나 생성에 실패했습니다.");
  }
}

export async function generateImage(prompt: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error("API 키가 입력되지 않았습니다.");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // 이미지 생성 지원 모델로 업데이트
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found");
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("이미지 생성에 실패했습니다.");
  }
}
