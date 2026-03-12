import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ImageUpload } from './components/ImageUpload';
import { generateBlogPost, BlogPostParams, generateImage } from './services/gemini';
import { Loader2, Copy, Check, Sparkles, FileText, Target, MousePointerClick, Database, ShieldAlert, Image as ImageIcon, BookOpen, Download, Hash, Key } from 'lucide-react';
import { COLOR_THEMES } from './constants';

export default function App() {
  // 1. API 키를 저장할 상태 추가
  const [userApiKey, setUserApiKey] = useState<string>('');
  
  const [formData, setFormData] = useState<Omit<BlogPostParams, 'images'>>({
    postType: '브랜드 블로그',
    topic: '',
    targetPersona: '',
    cta: '',
    keyInfo: '',
    tone: '전문적이지만 쉽게, 과장 금지',
    evidenceAssets: '현장 사진',
    existingContent: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState<{ html: string; report: string; prompts: string[]; hashtags: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [reportCopied, setReportCopied] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);
  const [hashtagsCopied, setHashtagsCopied] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 2. API 키 체크
    if (!userApiKey) {
      alert('구글 Gemini API 키를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedContent(null);
    setGeneratedImages([]);

    try {
      // 3. API 호출 시 키를 파라미터로 전달
      const content = await generateBlogPost({ ...formData, images }, userApiKey);
      setGeneratedContent(content);
      
      // Automatically generate images if prompts exist
      if (content.prompts && content.prompts.length > 0) {
        setImageLoading(true);
        // Generate images sequentially to avoid rate limits or parallel if quota allows.
        // Let's try parallel for speed, but limit to 3.
        const imagePromises = content.prompts.slice(0, 3).map(prompt => generateImage(prompt, userApiKey));
        const newImages = await Promise.all(imagePromises);
        setGeneratedImages(newImages);
        setImageLoading(false);
      }

    } catch (err: any) {
      setError(err.message || '블로그 포스팅 생성에 실패했습니다.');
      setImageLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const copyReport = () => {
    if (!generatedContent?.report) return;
    navigator.clipboard.writeText(generatedContent.report);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  };

  const copyHashtags = () => {
    if (!generatedContent?.hashtags) return;
    navigator.clipboard.writeText(generatedContent.hashtags);
    setHashtagsCopied(true);
    setTimeout(() => setHashtagsCopied(false), 2000);
  };

  const copyHtml = async () => {
    if (!contentRef.current) return;

    try {
      // Get the HTML content
      const htmlContent = contentRef.current.innerHTML;
      // Create a Blob with the HTML content
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([contentRef.current.innerText], { type: 'text/plain' });
      
      // Use the Clipboard API to write the HTML
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      })];
      
      await navigator.clipboard.write(data);
      setHtmlCopied(true);
      setTimeout(() => setHtmlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy rich text:', err);
      // Fallback to plain text if rich text fails
      if (generatedContent) {
        navigator.clipboard.writeText(generatedContent.html);
        setHtmlCopied(true);
        setTimeout(() => setHtmlCopied(false), 2000);
      }
    }
  };

  const downloadImage = (base64Str: string, index: number) => {
    const link = document.createElement('a');
    link.href = base64Str;
    link.download = `generated-image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?ixlib=rb-4.0.3&auto=format&fit=crop&w=2342&q=80")` 
      }}
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-4">
          <span className="text-white/40 text-xs font-mono tracking-widest uppercase">made by MIR</span>
        </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl tracking-tight drop-shadow-lg">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">네이버 Agent N</span> 에디터
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-200 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl drop-shadow-md">
            스마트블록 상위 노출을 위한 전략적 콘텐츠 생성 및 진단 도구
          </p>
        </div>

        {/* 상단에 API 키 입력 섹션 추가 */}
        <div className="max-w-md mx-auto mb-8 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
          <label className="block text-xs font-medium text-white/80 mb-2 flex items-center gap-2">
            <Key className="w-3 h-3" /> Gemini API Key
          </label>
          <input
            type="password"
            placeholder="AI Studio에서 발급받은 키를 입력하세요"
            className="w-full bg-white/20 border-white/30 text-white placeholder:text-white/50 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            value={userApiKey}
            onChange={(e) => setUserApiKey(e.target.value)}
          />
          <p className="mt-2 text-[10px] text-white/40">키는 브라우저 메모리에만 저장되며 서버로 전송되지 않습니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            <div className="px-6 py-8 sm:p-10">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-500" />
                전략 설정
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. 글 유형 */}
                <div>
                  <label htmlFor="postType" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> 글 유형
                  </label>
                  <select
                    name="postType"
                    id="postType"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    value={formData.postType}
                    onChange={handleInputChange}
                  >
                    <option value="브랜드 블로그">브랜드 블로그 (신뢰도 중심)</option>
                    <option value="네이버 크리에이터/로컬">네이버 크리에이터/로컬 (경험 중심)</option>
                    <option value="애드센스/수익형">애드센스/수익형 (정보성 중심)</option>
                  </select>
                </div>

                {/* 2. 주제 */}
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> 주제 (필수)
                  </label>
                  <input
                    type="text"
                    name="topic"
                    id="topic"
                    required
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    placeholder="예: 동탄 영어학원 선택 기준, 30대 재테크 노하우"
                    value={formData.topic}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 3. 타깃 페르소나 */}
                <div>
                  <label htmlFor="targetPersona" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Target className="w-4 h-4" /> 타깃 페르소나
                  </label>
                  <input
                    type="text"
                    name="targetPersona"
                    id="targetPersona"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    placeholder="예: 동탄2 거주 중1 학부모, 영어 기초가 급함"
                    value={formData.targetPersona}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 4. 목표 행동 (CTA) */}
                <div>
                  <label htmlFor="cta" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4" /> 목표 행동 (CTA)
                  </label>
                  <input
                    type="text"
                    name="cta"
                    id="cta"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    placeholder="예: 상담 신청, 이웃 추가, 자료 다운로드"
                    value={formData.cta}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 5. 핵심 정보/자료 */}
                <div>
                  <label htmlFor="keyInfo" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Database className="w-4 h-4" /> 핵심 정보/자료 (불릿으로 입력)
                  </label>
                  <textarea
                    name="keyInfo"
                    id="keyInfo"
                    rows={4}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    placeholder="- 가격: 월 30만원&#13;- 특징: 1:1 맞춤 수업&#13;- 위치: 동탄역 도보 5분"
                    value={formData.keyInfo}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 6. 톤 & 금지사항 */}
                <div>
                  <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> 톤 & 금지사항
                  </label>
                  <input
                    type="text"
                    name="tone"
                    id="tone"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    placeholder="예: 과장 금지, 전문적이지만 쉽게, 개인정보 언급 금지"
                    value={formData.tone}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 7. 보유 증거 자산 */}
                <div>
                  <label htmlFor="evidenceAssets" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> 보유 증거 자산
                  </label>
                  <input
                    type="text"
                    name="evidenceAssets"
                    id="evidenceAssets"
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    placeholder="예: 현장 사진, 상담 일지, 전후 비교 사진"
                    value={formData.evidenceAssets}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 8. 기존 글 (선택) */}
                <div>
                  <label htmlFor="existingContent" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> 기존 글 (평가/개정 시 입력)
                  </label>
                  <textarea
                    name="existingContent"
                    id="existingContent"
                    rows={6}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-3 border transition-colors"
                    placeholder="기존 블로그 글이 있다면 여기에 붙여넣으세요. (비워두면 신규 생성 모드로 작동합니다)"
                    value={formData.existingContent}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 이미지 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    참고 이미지 업로드 (선택)
                  </label>
                  <ImageUpload onImagesChange={handleImagesChange} />
                  <p className="mt-2 text-xs text-gray-500">
                    이미지를 업로드하면 AI가 내용을 분석하여 글 작성에 반영합니다.
                  </p>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4 border border-red-100">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">오류</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      분석 및 생성 중...
                    </>
                  ) : (
                    'Agent N 전략 실행'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Output Preview */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full min-h-[800px] border border-white/20">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <h3 className="text-lg font-medium text-gray-900">결과 리포트</h3>
            </div>
            <div className="flex-1 p-6 overflow-y-auto bg-white">
              {generatedContent ? (
                <div className="space-y-8">
                  {/* 전략 리포트 */}
                  <div className="prose prose-sm max-w-none bg-blue-50 p-6 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2 m-0">
                        <Target className="w-5 h-5" /> Agent N 전략 분석
                      </h4>
                      <button
                        onClick={copyReport}
                        className="inline-flex items-center px-2.5 py-1.5 border border-blue-200 shadow-sm text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        {reportCopied ? (
                          <>
                            <Check className="-ml-0.5 mr-1.5 h-3 w-3" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="-ml-0.5 mr-1.5 h-3 w-3" />
                            리포트 복사
                          </>
                        )}
                      </button>
                    </div>
                    <ReactMarkdown>{generatedContent.report}</ReactMarkdown>
                  </div>

                  {/* AI Generated Images */}
                  {(imageLoading || generatedImages.length > 0) && (
                    <div className="border-t-2 border-dashed border-gray-300 pt-8">
                      <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" /> AI 생성 이미지
                      </h4>
                      {imageLoading ? (
                        <div className="flex items-center justify-center p-8 bg-purple-50 rounded-lg border border-purple-100">
                          <Loader2 className="animate-spin h-6 w-6 text-purple-600 mr-2" />
                          <span className="text-purple-700">고품질 이미지를 생성하고 있습니다...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {generatedImages.map((imgSrc, idx) => (
                            <div key={idx} className="relative group rounded-lg overflow-hidden shadow-md border border-gray-200">
                              <img src={imgSrc} alt={`Generated ${idx + 1}`} className="w-full h-auto object-cover" />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <button
                                  onClick={() => downloadImage(imgSrc, idx)}
                                  className="bg-white text-gray-900 px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg hover:bg-gray-100 transition-colors"
                                >
                                  <Download className="w-4 h-4" /> 다운로드
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hashtags */}
                  {generatedContent.hashtags && (
                    <div className="border-t-2 border-dashed border-gray-300 pt-8">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2 m-0">
                          <Hash className="w-5 h-5" /> 추천 해시태그
                        </h4>
                        <button
                          onClick={copyHashtags}
                          className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          {hashtagsCopied ? (
                            <>
                              <Check className="-ml-0.5 mr-1.5 h-3 w-3 text-green-500" />
                              복사됨
                            </>
                          ) : (
                            <>
                              <Copy className="-ml-0.5 mr-1.5 h-3 w-3" />
                              해시태그 복사
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 font-medium">
                        {generatedContent.hashtags}
                      </div>
                    </div>
                  )}

                  {/* 생성된 본문 */}
                  {generatedContent.html && (
                    <div className="border-t-2 border-dashed border-gray-300 pt-8">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2 m-0">
                          <FileText className="w-5 h-5" /> 블로그 본문 미리보기
                        </h4>
                        <button
                          onClick={copyHtml}
                          className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          {htmlCopied ? (
                            <>
                              <Check className="-ml-1 mr-2 h-4 w-4" />
                              복사 완료!
                            </>
                          ) : (
                            <>
                              <Copy className="-ml-1 mr-2 h-4 w-4" />
                              네이버 블로그용 복사
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 text-sm text-yellow-800 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                          <strong>팁:</strong> '네이버 블로그용 복사' 버튼을 누른 후, 네이버 블로그 글쓰기 화면에서 <strong>붙여넣기(Ctrl+V)</strong> 하세요. 서식과 스타일이 그대로 유지됩니다.
                        </p>
                      </div>
                      <div 
                        ref={contentRef}
                        className="prose prose-green max-w-none prose-headings:font-bold prose-a:text-green-600 bg-white p-4 border border-gray-200 rounded-lg shadow-sm"
                        dangerouslySetInnerHTML={{ __html: generatedContent.html }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                  <div className="bg-gray-50 p-6 rounded-full mb-4">
                    <Sparkles className="w-12 h-12 text-gray-300" />
                  </div>
                  <p className="text-lg font-medium text-gray-600">준비 완료</p>
                  <p className="text-sm mt-2 max-w-xs mx-auto">
                    전략 정보를 입력하고 실행하면<br/>심층 분석 리포트와 최적화된 글을 생성합니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <span className="text-white/40 text-xs font-mono tracking-widest uppercase">made by MIR</span>
        </div>
      </div>
    </div>
  );
}
