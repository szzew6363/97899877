/**
 * HelpCenterPage — 3D Holographic Knowledge Base & Support
 * FAQ accordion · search · video tutorials · live chat
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpenCheck, X, Search, ChevronDown, ChevronRight, MessageSquare, ExternalLink, Zap, Shield, Brain, Code2, Star, Play, HelpCircle, Mail, Globe } from "lucide-react";

interface FAQ { id: string; q: string; a: string; category: string; helpful: number }
interface Article { id: string; title: string; category: string; readTime: string; views: number; featured?: boolean }

const CATEGORIES = ["الكل", "البدء", "الاشتراك", "الأمان", "API", "النماذج", "الأدوات", "استكشاف الأخطاء"];

const FAQS: FAQ[] = [
  { id: "1", q: "كيف أبدأ استخدام KaliGPT؟", a: "ببساطة اكتب سؤالك أو مهمتك في مربع الدردشة. يمكنك اختيار نموذج AI من القائمة العلوية، وتغيير الشخصية (Persona)، وتفعيل أوضاع متقدمة مثل Council أو Godmode للحصول على أفضل النتائج.", category: "البدء", helpful: 234 },
  { id: "2", q: "ما الفرق بين الخطط المختلفة؟", a: "Free: 10K توكن، نموذج واحد. Starter ($25): 300K توكن، 5 نماذج، توليد صور. Professional ($90): 1.5M توكن، Agent IDE، بحث الويب المظلم. Elite ($150): 3M توكن، Godmode، كل شيء غير محدود.", category: "الاشتراك", helpful: 189 },
  { id: "3", q: "كيف أفعّل اشتراكي بعد الدفع؟", a: "بعد الدفع، أرسل إثبات الدفع عبر التيليجرام (t.me/mr7ai_support). ستتلقى كود تفعيل خلال 1-24 ساعة. أدخل الكود في: الحساب > تفعيل الاشتراك.", category: "الاشتراك", helpful: 312 },
  { id: "4", q: "هل بياناتي آمنة؟", a: "نعم. نستخدم HTTPS/TLS 1.3، تشفير bcrypt للكلمات المرور، JWT مع انتهاء صلاحية، ونظام حماية ضد هجمات القوة الغاشمة. لا نشارك بياناتك مع أي طرف ثالث.", category: "الأمان", helpful: 145 },
  { id: "5", q: "كيف أستخدم Council Mode؟", a: "وضع Council يشغّل 105 نموذج AI بالتوازي للحصول على أشمل تحليل ممكن. اضغط على القائمة المنسدلة لوضع المحادثة واختر 'Council'. يتطلب خطة Professional أو أعلى.", category: "النماذج", helpful: 267 },
  { id: "6", q: "لماذا يتوقف البث أحياناً؟", a: "قد يكون بسبب: 1) تحديث صفحة أثناء البث — تجنب ذلك. 2) انقطاع الإنترنت — تحقق من اتصالك. 3) حد معدل الطلبات — انتظر دقيقة ثم أعد المحاولة. 4) حجم رد كبير — جرب تقسيم السؤال.", category: "استكشاف الأخطاء", helpful: 198 },
  { id: "7", q: "كيف أضيف مفتاح API الخاص بي؟", a: "افتح الإعدادات > مزودو AI > أضف مزود. ضع مفتاح API الخاص بك وعنوان API Base URL. نظام KaliGPT يدعم OpenAI، Anthropic، Groq، Gemini، وأي مزود متوافق مع OpenAI API.", category: "API", helpful: 178 },
  { id: "8", q: "ما هي Arsenal Hub؟", a: "Arsenal Hub مركز إطلاق موحد يضم 18 أداة أمنية مدمجة: KaliAgent، NEXUS، JARVIS، Parseltongue، RAGFlow، Team Agent، Skills Library، وغيرها. افتح من زر Arsenal في الشريط العلوي.", category: "الأدوات", helpful: 223 },
];

const ARTICLES: Article[] = [
  { id: "1", title: "دليل البدء السريع — KaliGPT في 5 دقائق", category: "البدء", readTime: "5 دقائق", views: 8920, featured: true },
  { id: "2", title: "اختبار الاختراق باستخدام AI — دليل شامل", category: "الأمان", readTime: "15 دقيقة", views: 12400, featured: true },
  { id: "3", title: "إعداد مفاتيح API والمزودين المخصصين", category: "API", readTime: "8 دقائق", views: 5600 },
  { id: "4", title: "استخدام Council Mode بشكل فعّال", category: "النماذج", readTime: "6 دقائق", views: 7800 },
  { id: "5", title: "RAG System — الدردشة مع وثائقك", category: "الأدوات", readTime: "10 دقائق", views: 4200 },
  { id: "6", title: "Godmode Mode — التحليل الأمني الشامل", category: "النماذج", readTime: "12 دقيقة", views: 9100 },
];

interface Props { onClose?: () => void }

export function HelpCenterPage({ onClose }: Props) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const [helpful, setHelpful] = useState<Set<string>>(new Set());

  const markHelpful = (id: string) => setHelpful(h => { const n = new Set(h); n.add(id); return n; });

  const filtered = FAQS.filter(f => {
    const matchSearch = !search || f.q.includes(search) || f.a.includes(search);
    const matchCat = catFilter === "الكل" || f.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%,rgba(226,18,39,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><BookOpenCheck className="w-5 h-5 text-red-400" /></div>
          <div><h2 className="text-base font-bold text-white">مركز المساعدة — Help Center</h2><p className="text-xs text-zinc-600">{FAQS.length} سؤال شائع · {ARTICLES.length} مقال</p></div>
        </div>
        {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في مركز المساعدة..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-red-500/30" />
        </div>
        {/* Quick links */}
        <div className="grid grid-cols-3 gap-2">
          {[["t.me/mr7ai_support", "تيليجرام", MessageSquare, "#26a5e4"], ["support@mr7.ai", "إيميل", Mail, "#e21227"], ["docs.mr7.ai", "التوثيق", Globe, "#10b981"]].map(([href, label, Icon, color]) => (
            <a key={label as string} href={`${typeof href === "string" && href.startsWith("t.me") ? "https://" : "mailto:"}${href}`} target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.02]" style={{ background: `${color as string}08`, borderColor: `${color as string}20` }}>
              {typeof Icon !== "string" && <Icon className="w-5 h-5" style={{ color: color as string }} />}
              <span className="text-[11px] font-medium text-zinc-400">{label as string}</span>
            </a>
          ))}
        </div>
        {/* Featured articles */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" />مقالات مميزة</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ARTICLES.filter(a => a.featured).map((article, i) => (
              <motion.div key={article.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="p-3.5 rounded-xl bg-red-500/6 border border-red-500/15 hover:border-red-500/25 cursor-pointer transition-all group">
                <p className="text-sm font-medium text-white group-hover:text-red-300 transition-colors">{article.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                  <span className="bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">{article.category}</span>
                  <span>{article.readTime}</span>
                  <span>{article.views >= 1000 ? `${(article.views / 1000).toFixed(0)}K` : article.views} مشاهدة</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        {/* FAQ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5 text-zinc-500" />الأسئلة الشائعة</p>
            <div className="flex gap-1.5 overflow-x-auto">
              {CATEGORIES.slice(0, 5).map(c => (
                <button key={c} onClick={() => setCatFilter(c)} className={`px-2 py-1 rounded-full text-[10px] font-medium flex-shrink-0 transition-all ${catFilter === c ? "bg-red-500/20 border border-red-500/25 text-red-400" : "text-zinc-600 hover:text-zinc-400"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filtered.map((faq, i) => (
              <motion.div key={faq.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-xl border overflow-hidden transition-all ${openFAQ === faq.id ? "border-red-500/20 bg-red-500/5" : "border-white/6 bg-white/3 hover:border-white/10"}`}>
                <button className="w-full flex items-center justify-between gap-3 p-3.5 text-right" onClick={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}>
                  <p className="text-sm font-medium text-zinc-200">{faq.q}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] bg-white/6 text-zinc-500 px-1.5 py-0.5 rounded">{faq.category}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform ${openFAQ === faq.id ? "rotate-180" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {openFAQ === faq.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="px-3.5 pb-3.5">
                        <p className="text-sm text-zinc-400 leading-relaxed border-t border-white/6 pt-3">{faq.a}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-[10px] text-zinc-600">هل كانت مفيدة؟</span>
                          <button onClick={() => markHelpful(faq.id)} disabled={helpful.has(faq.id)} className={`text-[10px] px-2 py-1 rounded-full border transition-all ${helpful.has(faq.id) ? "bg-green-500/15 border-green-500/20 text-green-400" : "border-white/10 text-zinc-500 hover:text-green-400"}`}>
                            {helpful.has(faq.id) ? "✓ شكراً" : "👍 نعم"} ({faq.helpful + (helpful.has(faq.id) ? 1 : 0)})
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
            {filtered.length === 0 && <div className="text-center py-8 text-zinc-600 text-sm">لا توجد نتائج للبحث</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
