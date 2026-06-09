import { useEffect, useState } from "react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { Switch } from "@/components/ui/switch";
import {
  Server, Wifi, WifiOff, CheckCircle2, AlertCircle, ExternalLink, Cpu,
  RefreshCw, Download, Search, ChevronDown, ChevronUp, Zap, Brain,
  Shield, Code2, Eye, Globe, Star, Loader2, Copy, Check, Terminal,
  HardDrive, Gauge, MemoryStick, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

type ModelTag = "UNCENSORED" | "FAST" | "POWERFUL" | "CODE" | "VISION" | "REASONING" | "MULTILINGUAL" | "TINY" | "EMBED";
type ModelGroup = "Dolphin / Uncensored" | "Llama Family" | "Mistral Family" | "DeepSeek" | "Qwen" | "Phi / Small" | "Code Models" | "Vision Models" | "Arabic / Multilingual" | "Gemma" | "Security Specialist" | "Mixtral" | "Embedding Models";

const QUICK_MODELS: {
  id: string; label: string; tag: ModelTag; group: ModelGroup;
  size?: string; ctx?: string; hot?: boolean;
}[] = [
  // Dolphin / Uncensored
  { id: "dolphin-mixtral", label: "Dolphin Mixtral 8x7B", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "26GB", ctx: "32K", hot: true },
  { id: "dolphin-llama3:8b", label: "Dolphin Llama3 8B", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "4.7GB", ctx: "8K" },
  { id: "dolphin-llama3:70b", label: "Dolphin Llama3 70B", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "40GB", ctx: "8K" },
  { id: "dolphin-phi3", label: "Dolphin Phi-3 Mini", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "2.2GB", ctx: "4K" },
  { id: "dolphin3", label: "Dolphin 3.0 Llama3.2", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "2GB", ctx: "128K", hot: true },
  { id: "dolphincoder", label: "DolphinCoder", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "3.8GB", ctx: "16K" },

  // Llama Family
  { id: "llama3.1:8b", label: "Llama 3.1 8B", tag: "FAST", group: "Llama Family", size: "4.7GB", ctx: "128K", hot: true },
  { id: "llama3.1:70b", label: "Llama 3.1 70B", tag: "POWERFUL", group: "Llama Family", size: "40GB", ctx: "128K" },
  { id: "llama3.1:405b", label: "Llama 3.1 405B", tag: "POWERFUL", group: "Llama Family", size: "230GB", ctx: "128K" },
  { id: "llama3.2:1b", label: "Llama 3.2 1B", tag: "TINY", group: "Llama Family", size: "1.3GB", ctx: "128K" },
  { id: "llama3.2:3b", label: "Llama 3.2 3B", tag: "FAST", group: "Llama Family", size: "2GB", ctx: "128K" },
  { id: "llama3.2-vision:11b", label: "Llama 3.2 Vision 11B", tag: "VISION", group: "Llama Family", size: "7.9GB", ctx: "128K" },
  { id: "llama3.3:70b", label: "Llama 3.3 70B", tag: "POWERFUL", group: "Llama Family", size: "43GB", ctx: "128K", hot: true },
  { id: "llama4:scout", label: "Llama 4 Scout", tag: "POWERFUL", group: "Llama Family", size: "67GB", ctx: "10M", hot: true },

  // Mistral Family
  { id: "mistral:7b", label: "Mistral 7B v0.3", tag: "FAST", group: "Mistral Family", size: "4.1GB", ctx: "32K" },
  { id: "mixtral:8x7b", label: "Mixtral 8x7B", tag: "POWERFUL", group: "Mistral Family", size: "26GB", ctx: "32K" },
  { id: "mixtral:8x22b", label: "Mixtral 8x22B", tag: "POWERFUL", group: "Mistral Family", size: "80GB", ctx: "64K" },
  { id: "mistral-nemo", label: "Mistral Nemo 12B", tag: "FAST", group: "Mistral Family", size: "7.1GB", ctx: "128K", hot: true },
  { id: "mistral-small", label: "Mistral Small 3.1", tag: "FAST", group: "Mistral Family", size: "15GB", ctx: "128K" },

  // DeepSeek
  { id: "deepseek-r1:7b", label: "DeepSeek-R1 7B", tag: "REASONING", group: "DeepSeek", size: "4.7GB", ctx: "128K", hot: true },
  { id: "deepseek-r1:14b", label: "DeepSeek-R1 14B", tag: "REASONING", group: "DeepSeek", size: "9.0GB", ctx: "128K" },
  { id: "deepseek-r1:32b", label: "DeepSeek-R1 32B", tag: "REASONING", group: "DeepSeek", size: "19GB", ctx: "128K" },
  { id: "deepseek-r1:70b", label: "DeepSeek-R1 70B", tag: "REASONING", group: "DeepSeek", size: "43GB", ctx: "128K" },
  { id: "deepseek-coder-v2", label: "DeepSeek Coder V2", tag: "CODE", group: "DeepSeek", size: "8.9GB", ctx: "128K" },
  { id: "deepseek-v3", label: "DeepSeek-V3", tag: "POWERFUL", group: "DeepSeek", size: "39GB", ctx: "64K", hot: true },

  // Qwen
  { id: "qwen2.5:7b", label: "Qwen 2.5 7B", tag: "MULTILINGUAL", group: "Qwen", size: "4.7GB", ctx: "128K", hot: true },
  { id: "qwen2.5:14b", label: "Qwen 2.5 14B", tag: "MULTILINGUAL", group: "Qwen", size: "9.0GB", ctx: "128K" },
  { id: "qwen2.5:32b", label: "Qwen 2.5 32B", tag: "MULTILINGUAL", group: "Qwen", size: "19GB", ctx: "128K" },
  { id: "qwen2.5:72b", label: "Qwen 2.5 72B", tag: "POWERFUL", group: "Qwen", size: "47GB", ctx: "128K" },
  { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B", tag: "CODE", group: "Qwen", size: "4.7GB", ctx: "32K" },
  { id: "qwq", label: "QwQ 32B (Reasoning)", tag: "REASONING", group: "Qwen", size: "19GB", ctx: "32K", hot: true },

  // Phi / Small
  { id: "phi4", label: "Phi-4 14B", tag: "POWERFUL", group: "Phi / Small", size: "8.9GB", ctx: "16K", hot: true },
  { id: "phi4-mini", label: "Phi-4 Mini 3.8B", tag: "FAST", group: "Phi / Small", size: "2.5GB", ctx: "128K" },
  { id: "phi3.5", label: "Phi-3.5 Mini 3.8B", tag: "FAST", group: "Phi / Small", size: "2.2GB", ctx: "128K" },
  { id: "smollm2:1.7b", label: "SmolLM2 1.7B", tag: "TINY", group: "Phi / Small", size: "1.0GB", ctx: "8K" },
  { id: "tinyllama", label: "TinyLlama 1.1B", tag: "TINY", group: "Phi / Small", size: "638MB", ctx: "2K" },

  // Code Models
  { id: "codellama:7b", label: "Code Llama 7B", tag: "CODE", group: "Code Models", size: "3.8GB", ctx: "16K" },
  { id: "codellama:34b", label: "Code Llama 34B", tag: "CODE", group: "Code Models", size: "19GB", ctx: "16K" },
  { id: "starcoder2:7b", label: "StarCoder2 7B", tag: "CODE", group: "Code Models", size: "4.0GB", ctx: "16K" },
  { id: "codegemma:7b", label: "CodeGemma 7B", tag: "CODE", group: "Code Models", size: "5.0GB", ctx: "8K" },

  // Vision Models
  { id: "llava:7b", label: "LLaVA 7B", tag: "VISION", group: "Vision Models", size: "4.5GB", ctx: "4K" },
  { id: "llava:34b", label: "LLaVA 34B", tag: "VISION", group: "Vision Models", size: "20GB", ctx: "4K" },
  { id: "moondream", label: "Moondream2 1.4B", tag: "VISION", group: "Vision Models", size: "829MB", ctx: "2K" },
  { id: "minicpm-v", label: "MiniCPM-V 8B", tag: "VISION", group: "Vision Models", size: "5.5GB", ctx: "8K" },

  // Arabic / Multilingual
  { id: "aya:8b", label: "Aya 8B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.8GB", ctx: "8K", hot: true },
  { id: "aya:35b", label: "Aya 35B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "19GB", ctx: "8K" },
  { id: "qwen2:7b", label: "Qwen2 7B (متعدد اللغات)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.4GB", ctx: "128K" },

  // Gemma
  { id: "gemma2:2b", label: "Gemma 2 2B", tag: "TINY", group: "Gemma", size: "1.6GB", ctx: "8K" },
  { id: "gemma2:9b", label: "Gemma 2 9B", tag: "FAST", group: "Gemma", size: "5.4GB", ctx: "8K", hot: true },
  { id: "gemma2:27b", label: "Gemma 2 27B", tag: "POWERFUL", group: "Gemma", size: "16GB", ctx: "8K" },
  { id: "gemma3:12b", label: "Gemma 3 12B", tag: "FAST", group: "Gemma", size: "8.1GB", ctx: "128K", hot: true },
  { id: "gemma3:27b", label: "Gemma 3 27B", tag: "POWERFUL", group: "Gemma", size: "17GB", ctx: "128K" },
  { id: "gemma3:4b", label: "Gemma 3 4B", tag: "TINY", group: "Gemma", size: "2.7GB", ctx: "128K" },
  { id: "gemma3:1b", label: "Gemma 3 1B (Tiny)", tag: "TINY", group: "Gemma", size: "815MB", ctx: "32K" },

  // Security / Uncensored Specialist
  { id: "dolphin3:8b", label: "Dolphin 3.0 8B", tag: "UNCENSORED", group: "Security Specialist", size: "4.9GB", ctx: "128K", hot: true },
  { id: "dolphin-llama3:8b", label: "Dolphin Llama3 8B", tag: "UNCENSORED", group: "Security Specialist", size: "4.7GB", ctx: "8K", hot: true },
  { id: "dolphin-llama3:70b", label: "Dolphin Llama3 70B", tag: "UNCENSORED", group: "Security Specialist", size: "43GB", ctx: "8K" },
  { id: "nous-hermes2:34b", label: "Nous-Hermes-2 34B", tag: "UNCENSORED", group: "Security Specialist", size: "19GB", ctx: "4K" },
  { id: "wizard-vicuna-uncensored:30b", label: "Wizard Vicuna 30B (Uncensored)", tag: "UNCENSORED", group: "Security Specialist", size: "18GB", ctx: "2K" },
  { id: "solar-pro", label: "SOLAR Pro 22B", tag: "POWERFUL", group: "Security Specialist", size: "14GB", ctx: "4K" },

  // Code Specialist — Extended
  { id: "qwen2.5-coder:7b", label: "Qwen2.5 Coder 7B", tag: "CODE", group: "Code Models", size: "4.7GB", ctx: "32K", hot: true },
  { id: "qwen2.5-coder:32b", label: "Qwen2.5 Coder 32B", tag: "CODE", group: "Code Models", size: "19GB", ctx: "32K", hot: true },
  { id: "devstral", label: "Devstral 24B (Code)", tag: "CODE", group: "Code Models", size: "14GB", ctx: "128K", hot: true },
  { id: "codegemma:2b", label: "CodeGemma 2B (Tiny)", tag: "CODE", group: "Code Models", size: "1.6GB", ctx: "8K" },
  { id: "deepseek-coder-v2:16b", label: "DeepSeek Coder V2 16B", tag: "CODE", group: "Code Models", size: "8.9GB", ctx: "128K", hot: true },
  { id: "deepseek-coder:6.7b", label: "DeepSeek Coder 6.7B", tag: "CODE", group: "Code Models", size: "3.8GB", ctx: "16K" },
  { id: "starcoder2:15b", label: "StarCoder2 15B", tag: "CODE", group: "Code Models", size: "9.1GB", ctx: "16K" },
  { id: "starcoder2:3b", label: "StarCoder2 3B", tag: "CODE", group: "Code Models", size: "1.7GB", ctx: "16K" },
  { id: "phind-codellama:34b", label: "Phind CodeLlama 34B", tag: "CODE", group: "Code Models", size: "19GB", ctx: "16K" },

  // Vision Extended
  { id: "llava:13b", label: "LLaVA 13B", tag: "VISION", group: "Vision Models", size: "8.0GB", ctx: "4K" },
  { id: "llava-llama3:8b", label: "LLaVA-Llama3 8B", tag: "VISION", group: "Vision Models", size: "5.5GB", ctx: "8K", hot: true },
  { id: "llava-phi3:3.8b", label: "LLaVA-Phi3 3.8B", tag: "VISION", group: "Vision Models", size: "2.9GB", ctx: "4K" },
  { id: "minicpm-v:8b", label: "MiniCPM-V 8B", tag: "VISION", group: "Vision Models", size: "5.5GB", ctx: "8K" },
  { id: "qwen2.5vl:7b", label: "Qwen2.5-VL 7B", tag: "VISION", group: "Vision Models", size: "4.9GB", ctx: "128K", hot: true },
  { id: "qwen2.5vl:72b", label: "Qwen2.5-VL 72B", tag: "VISION", group: "Vision Models", size: "46GB", ctx: "128K" },
  { id: "granite3.2-vision:2b", label: "Granite 3.2 Vision 2B", tag: "VISION", group: "Vision Models", size: "1.7GB", ctx: "128K" },

  // Reasoning Extended
  { id: "deepseek-r1:1.5b", label: "DeepSeek-R1 1.5B (Tiny)", tag: "REASONING", group: "DeepSeek", size: "1.1GB", ctx: "128K" },
  { id: "deepseek-r1:14b", label: "DeepSeek-R1 14B", tag: "REASONING", group: "DeepSeek", size: "9.0GB", ctx: "128K", hot: true },
  { id: "deepseek-r1:32b", label: "DeepSeek-R1 32B", tag: "REASONING", group: "DeepSeek", size: "19GB", ctx: "128K", hot: true },
  { id: "deepseek-r1:70b", label: "DeepSeek-R1 70B", tag: "REASONING", group: "DeepSeek", size: "43GB", ctx: "128K" },

  // Mixtral Family
  { id: "mixtral:8x7b", label: "Mixtral 8x7B MoE", tag: "POWERFUL", group: "Mixtral", size: "26GB", ctx: "32K" },
  { id: "mixtral:8x22b", label: "Mixtral 8x22B MoE", tag: "POWERFUL", group: "Mixtral", size: "80GB", ctx: "64K" },
  { id: "mistral-small:22b", label: "Mistral Small 22B", tag: "POWERFUL", group: "Mixtral", size: "13GB", ctx: "128K", hot: true },
  { id: "mistral:7b", label: "Mistral 7B v0.3", tag: "FAST", group: "Mixtral", size: "4.1GB", ctx: "32K" },

  // Arabic / Multilingual Extended
  { id: "aya-expanse:8b", label: "Aya Expanse 8B (متعدد)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.8GB", ctx: "128K", hot: true },
  { id: "aya-expanse:32b", label: "Aya Expanse 32B (متعدد)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "19GB", ctx: "128K" },
  { id: "allam:7b", label: "ALLaM 7B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.7GB", ctx: "32K", hot: true },
  { id: "silma-v1:9b", label: "SILMA 9B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "5.5GB", ctx: "8K" },
  { id: "command-r:35b", label: "Command R 35B", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "20GB", ctx: "128K" },
  { id: "seallm:7b", label: "SeaLLM 7B (SE Asia)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.2GB", ctx: "32K" },

  // Embedding Models
  { id: "nomic-embed-text", label: "Nomic Embed Text", tag: "EMBED", group: "Embedding Models", size: "274MB", ctx: "8K" },
  { id: "mxbai-embed-large", label: "MxBai Embed Large", tag: "EMBED", group: "Embedding Models", size: "670MB", ctx: "512" },
  { id: "bge-m3", label: "BGE-M3 Multilingual", tag: "EMBED", group: "Embedding Models", size: "1.2GB", ctx: "8K" },
  { id: "all-minilm:22m", label: "All-MiniLM 22M", tag: "EMBED", group: "Embedding Models", size: "45MB", ctx: "512" },
  { id: "snowflake-arctic-embed:22m", label: "Snowflake Arctic Embed 22M", tag: "EMBED", group: "Embedding Models", size: "45MB", ctx: "512" },
];

type TestStatus = "idle" | "testing" | "ok" | "fail";
type VramProfile = "4gb" | "8gb" | "12gb" | "16gb" | "24gb" | "48gb+";

const VRAM_PROFILES: { id: VramProfile; label: string; ram: string; recommended: string[] }[] = [
  { id: "4gb",   label: "4 GB",   ram: "4GB VRAM",   recommended: ["tinyllama", "smollm2:1.7b", "gemma2:2b", "dolphin-phi3"] },
  { id: "8gb",   label: "8 GB",   ram: "8GB VRAM",   recommended: ["dolphin3", "llama3.2:3b", "mistral-nemo", "deepseek-r1:7b", "qwen2.5:7b", "phi4-mini"] },
  { id: "12gb",  label: "12 GB",  ram: "12GB VRAM",  recommended: ["dolphin-llama3:8b", "gemma3:12b", "phi4", "deepseek-r1:14b", "qwq"] },
  { id: "16gb",  label: "16 GB",  ram: "16GB VRAM",  recommended: ["mistral-small", "deepseek-r1:14b", "qwen2.5:14b", "gemma2:9b"] },
  { id: "24gb",  label: "24 GB",  ram: "24GB VRAM",  recommended: ["dolphin-mixtral", "llama3.3:70b", "deepseek-r1:32b", "qwen2.5:32b", "gemma2:27b"] },
  { id: "48gb+", label: "48 GB+", ram: "48GB+ VRAM", recommended: ["dolphin-llama3:70b", "mixtral:8x7b", "deepseek-v3", "llama4:scout", "qwen2.5:72b"] },
];

interface LocalModelModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LocalModelModal({ open, onOpenChange }: LocalModelModalProps) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const lang = state.settings.language;

  const [endpoint, setEndpoint] = useState(state.settings.localEndpoint || "http://localhost:11434/v1");
  const [model, setModel] = useState(state.settings.localModel || "dolphin-mixtral");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("كل النماذج");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Dolphin / Uncensored", "DeepSeek"]));
  const [serverType, setServerType] = useState<"ollama" | "lmstudio" | "custom">("ollama");
  const [vramProfile, setVramProfile] = useState<VramProfile | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [ollamaManagerOpen, setOllamaManagerOpen] = useState(false);
  const [installedModels, setInstalledModels] = useState<{ name: string; size: number; modified_at: string }[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [pullName, setPullName] = useState("");
  const [pullProgress, setPullProgress] = useState<{ status: string; completed?: number; total?: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

  const useLocal = state.settings.useLocalModel;

  const GROUPS = Array.from(new Set(QUICK_MODELS.map((m) => m.group)));

  const filtered = QUICK_MODELS.filter((m) => {
    const matchSearch = !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    const matchGroup = activeGroup === "كل النماذج" || m.group === activeGroup;
    return matchSearch && matchGroup;
  });

  function toggleLocalModel(v: boolean) {
    dispatch({ type: "SET_SETTINGS", patch: { useLocalModel: v } });
    toast({ description: v ? "تم تفعيل النموذج المحلي" : "تم التبديل إلى CHAT-GPT.ai" });
  }

  function save() {
    dispatch({ type: "SET_SETTINGS", patch: { localEndpoint: endpoint.trim(), localModel: model.trim() } });
    toast({ description: "تم حفظ إعدادات النموذج المحلي" });
  }

  function applyServerPreset(type: "ollama" | "lmstudio" | "custom") {
    setServerType(type);
    if (type === "ollama") setEndpoint("http://localhost:11434/v1");
    else if (type === "lmstudio") setEndpoint("http://localhost:1234/v1");
  }

  function getOllamaBase() {
    const base = endpoint.trim().replace(/\/v1\/?$/, "").replace(/\/$/, "");
    return base;
  }

  async function loadInstalledModels() {
    setLoadingInstalled(true);
    try {
      const res = await fetch(`${getOllamaBase()}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json() as { models?: { name: string; size: number; modified_at: string }[] };
        setInstalledModels(data.models ?? []);
        if ((data.models ?? []).length === 0) toast({ description: "لا توجد نماذج مثبتة حتى الآن." });
      } else {
        toast({ description: "تعذّر تحميل قائمة النماذج." });
      }
    } catch {
      toast({ description: "تعذّر الاتصال بـ Ollama. تأكد أنه يعمل." });
    } finally {
      setLoadingInstalled(false);
    }
  }

  async function pullModel() {
    if (!pullName.trim()) return;
    setPulling(true);
    setPullProgress({ status: "جارٍ التحميل..." });
    try {
      const res = await fetch(`${getOllamaBase()}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pullName.trim(), stream: true }),
      });
      if (!res.ok || !res.body) {
        toast({ description: `فشل: ${res.status}` });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line) as { status?: string; completed?: number; total?: number };
            setPullProgress({ status: obj.status ?? "", completed: obj.completed, total: obj.total });
          } catch { /* ignore */ }
        }
      }
      setPullProgress({ status: "اكتمل!" });
      toast({ description: `تم تحميل ${pullName.trim()} بنجاح.` });
      setPullName("");
      await loadInstalledModels();
    } catch (e: unknown) {
      toast({ description: `فشل التحميل: ${(e as Error).message}` });
    } finally {
      setPulling(false);
    }
  }

  async function deleteModel(name: string) {
    setDeletingModel(name);
    try {
      const res = await fetch(`${getOllamaBase()}/api/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        toast({ description: `تم حذف ${name}` });
        setInstalledModels(prev => prev.filter(m => m.name !== name));
      } else {
        toast({ description: `فشل الحذف: ${res.status}` });
      }
    } catch (e: unknown) {
      toast({ description: `خطأ: ${(e as Error).message}` });
    } finally {
      setDeletingModel(null);
    }
  }

  async function detectModels() {
    setDetecting(true);
    const base = endpoint.trim().replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/models`, {
        headers: { "Authorization": "Bearer ollama" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const models = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id).filter(Boolean) : [];
        setDetectedModels(models);
        if (models.length > 0) {
          toast({ description: `تم اكتشاف ${models.length} نموذج` });
        } else {
          toast({ description: "لم يُكتشف أي نموذج" });
        }
      }
    } catch {
      toast({ description: "تعذّر الاتصال بالخادم" });
    } finally {
      setDetecting(false);
    }
  }

  async function testConnection() {
    setTestStatus("testing");
    setTestMsg("");
    const base = endpoint.trim().replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/models`, {
        headers: { "Authorization": "Bearer ollama" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const count = Array.isArray(data?.data) ? data.data.length : "?";
        setTestStatus("ok");
        setTestMsg(`متصل! ${count} نموذج متاح.`);
        setDetectedModels(Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id) : []);
      } else {
        setTestStatus("fail");
        setTestMsg(`فشل: ${res.status} ${res.statusText}`);
      }
    } catch {
      setTestStatus("fail");
      setTestMsg("لا يمكن الاتصال. تأكد أن الخادم يعمل وأن CORS مُفعّل.");
    }
  }

  const tagColor = (tag: string) => {
    const map: Record<string, string> = {
      UNCENSORED: "border-cyan-500/40 text-cyan-400 bg-cyan-400/10",
      FAST: "border-green-500/40 text-green-400 bg-green-400/10",
      POWERFUL: "border-violet-500/40 text-violet-400 bg-violet-400/10",
      CODE: "border-blue-500/40 text-blue-400 bg-blue-400/10",
      VISION: "border-pink-500/40 text-pink-400 bg-pink-400/10",
      REASONING: "border-amber-500/40 text-amber-400 bg-amber-400/10",
      MULTILINGUAL: "border-emerald-500/40 text-emerald-400 bg-emerald-400/10",
      TINY: "border-slate-500/40 text-slate-400 bg-slate-400/10",
    };
    return map[tag] ?? "border-border text-muted-foreground";
  };

  const tagIcon = (tag: string) => {
    const map: Record<string, React.ElementType> = {
      UNCENSORED: Shield, FAST: Zap, POWERFUL: Brain,
      CODE: Code2, VISION: Eye, REASONING: Brain,
      MULTILINGUAL: Globe, TINY: Cpu,
    };
    const Icon = map[tag] ?? Cpu;
    return <Icon className="w-2.5 h-2.5" />;
  };

  function toggleGroup(grp: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(grp)) next.delete(grp); else next.add(grp);
      return next;
    });
  }

  async function copyInstallCmd(modelId: string) {
    const cmd = `ollama run ${modelId}`;
    await navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  }

  const currentModelInfo = QUICK_MODELS.find(m => m.id === model);
  const recommendedByVram = vramProfile ? VRAM_PROFILES.find(v => v.id === vramProfile)?.recommended ?? [] : [];

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0">
          <Server className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-white">نموذج محلي (Ollama / LM Studio / Jan)</h2>
            <p className="text-[10px] text-[#555]">شغّل نماذج مفتوحة المصدر غير مقيّدة محلياً على جهازك واربطها بـ KaliGPT</p>
          </div>
          {useLocal && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-400/20 text-green-400 border border-green-400/30">مُفعّل</span>}
          <button onClick={() => onOpenChange(false)} className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white hover:border-[#e21227] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/60">
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-primary" />
              استخدام النموذج المحلي
            </div>
            <div className="text-[12px] text-muted-foreground mt-0.5">تجاوز CHAT-GPT.ai والاتصال بخادمك المحلي</div>
          </div>
          <Switch checked={useLocal} onCheckedChange={toggleLocalModel} />
        </div>

        {/* Hardware Profile (VRAM) */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <MemoryStick className="w-3.5 h-3.5 text-primary" /> ملف الأجهزة (VRAM) — اختياري
          </label>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {VRAM_PROFILES.map(p => (
              <button key={p.id} onClick={() => setVramProfile(prev => prev === p.id ? null : p.id)}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  vramProfile === p.id ? "bg-primary/15 border-primary/50 text-primary" : "border-border bg-background/40 text-muted-foreground hover:bg-accent"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {vramProfile && recommendedByVram.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Gauge className="w-3 h-3" /> نماذج موصى بها لـ {VRAM_PROFILES.find(v => v.id === vramProfile)?.ram}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedByVram.map(rid => {
                    const m = QUICK_MODELS.find(q => q.id === rid);
                    if (!m) return null;
                    return (
                      <button key={rid} onClick={() => setModel(rid)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors ${
                          model === rid ? "bg-primary/20 border-primary/50 text-primary" : "border-border bg-background/60 hover:bg-accent text-muted-foreground"
                        }`}>
                        {m.label}
                        {m.hot && <Star className="w-2 h-2 text-amber-400 fill-amber-400" />}
                        {m.size && <span className="text-[8px] text-muted-foreground/60 font-mono">{m.size}</span>}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Server Type Tabs */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-primary" /> نوع الخادم
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["ollama", "lmstudio", "custom"] as const).map((t) => (
              <button
                key={t}
                onClick={() => applyServerPreset(t)}
                className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors ${
                  serverType === t ? "bg-primary/10 border-primary/40 text-primary" : "border-border bg-background/60 text-muted-foreground hover:bg-accent"
                }`}
              >
                {t === "ollama" ? "Ollama" : t === "lmstudio" ? "LM Studio" : "مخصص"}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">عنوان الـ API</label>
          <div className="flex gap-2">
            <input
              value={endpoint}
              onChange={(e) => { setEndpoint(e.target.value); setServerType("custom"); }}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-primary"
              placeholder="http://localhost:11434/v1"
              spellCheck={false}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Ollama: :11434/v1 · LM Studio: :1234/v1 · Jan: :1337/v1 · text-generation-webui: :5000/v1
          </div>
        </div>

        {/* Model Name */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">اسم النموذج</label>
          <div className="flex gap-2">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-primary"
              placeholder="dolphin-mixtral"
              spellCheck={false}
            />
          </div>

          {/* Detected Models */}
          {detectedModels.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> النماذج المكتشفة ({detectedModels.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`px-2 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                      model === m ? "bg-primary/15 border-primary/40 text-primary" : "border-emerald-500/30 bg-background/60 hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Install Command */}
          {model.trim() && serverType === "ollama" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <code className="flex-1 text-[11px] font-mono text-emerald-300">ollama run {model.trim()}</code>
              <button onClick={() => copyInstallCmd(model.trim())}
                className="flex items-center gap-1 px-2 py-1 rounded border border-emerald-500/30 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                {copiedCmd ? <><Check className="w-3 h-3" /> تم</> : <><Copy className="w-3 h-3" /> نسخ</>}
              </button>
              {currentModelInfo && (
                <div className="flex items-center gap-1 text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                  <HardDrive className="w-2.5 h-2.5" />{currentModelInfo.size}
                </div>
              )}
            </motion.div>
          )}

          {/* Catalog */}
          <div className="rounded-xl border border-border bg-background/40 overflow-hidden">
            <div className="flex items-center gap-2 p-2 border-b border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في كتالوج النماذج..."
                className="flex-1 bg-transparent text-[12px] outline-none text-foreground"
              />
              {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>}
            </div>

            {/* Group Tabs */}
            {!search && (
              <div className="flex gap-1 px-2 py-1.5 overflow-x-auto border-b border-border no-scrollbar">
                {["كل النماذج", ...GROUPS].map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                      activeGroup === g ? "bg-primary text-white" : "bg-background/60 border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
              {search || activeGroup !== "كل النماذج" ? (
                <div className="flex flex-wrap gap-1.5">
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                        model === m.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border bg-background/60 hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      <span>{m.label}</span>
                      {m.hot && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                      <span className={`text-[8px] font-bold px-1 rounded border flex items-center gap-0.5 ${tagColor(m.tag)}`}>
                        {tagIcon(m.tag)}{m.tag}
                      </span>
                      {m.size && <span className="text-[8px] text-muted-foreground/60 font-mono">{m.size}</span>}
                    </button>
                  ))}
                  {filtered.length === 0 && <div className="text-[12px] text-muted-foreground py-4 text-center w-full">لا توجد نتائج</div>}
                </div>
              ) : (
                GROUPS.map((grp) => {
                  const grpModels = QUICK_MODELS.filter((m) => m.group === grp);
                  const isExpanded = expandedGroups.has(grp);
                  return (
                    <div key={grp} className="rounded-lg border border-border/50 overflow-hidden">
                      <button
                        onClick={() => toggleGroup(grp)}
                        className="w-full flex items-center justify-between px-3 py-1.5 bg-background/60 hover:bg-accent transition-colors"
                      >
                        <span className="text-[11px] font-bold text-foreground">{grp}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">{grpModels.length}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-2 flex flex-wrap gap-1.5">
                          {grpModels.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setModel(m.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                                model === m.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border bg-background/60 hover:bg-accent text-muted-foreground"
                              }`}
                            >
                              <span>{m.label}</span>
                              {m.hot && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                              <span className={`text-[8px] font-bold px-1 rounded border flex items-center gap-0.5 ${tagColor(m.tag)}`}>
                                {tagIcon(m.tag)}{m.tag}
                              </span>
                              {m.size && <span className="text-[8px] text-muted-foreground/60 font-mono">{m.size}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Ollama Model Manager */}
        {serverType === "ollama" && (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => {
                setOllamaManagerOpen(v => !v);
                if (!ollamaManagerOpen && installedModels.length === 0) loadInstalledModels();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-background/60 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 text-[12px] font-bold">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                مدير نماذج Ollama
                {installedModels.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    {installedModels.length} مثبت
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${ollamaManagerOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {ollamaManagerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-4 border-t border-border">
                    {/* Pull new model */}
                    <div>
                      <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Download className="w-3 h-3 text-primary" /> سحب نموذج جديد
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={pullName}
                          onChange={e => setPullName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !pulling && pullModel()}
                          placeholder="مثال: llama3.1:8b أو deepseek-r1:7b"
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-[12px] font-mono outline-none focus:border-primary"
                          disabled={pulling}
                        />
                        <button
                          onClick={pullModel}
                          disabled={pulling || !pullName.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 text-[12px] font-bold transition-colors"
                        >
                          {pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          سحب
                        </button>
                      </div>
                      {pulling && pullProgress && (
                        <div className="mt-2 space-y-1">
                          <div className="text-[11px] text-muted-foreground font-mono">{pullProgress.status}</div>
                          {pullProgress.total && pullProgress.completed !== undefined && (
                            <div className="w-full bg-border rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-primary transition-all"
                                style={{ width: `${Math.round((pullProgress.completed / pullProgress.total) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Installed models */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-bold tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <HardDrive className="w-3 h-3 text-cyan-400" /> النماذج المثبتة
                        </div>
                        <button
                          onClick={loadInstalledModels}
                          disabled={loadingInstalled}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingInstalled ? "animate-spin" : ""}`} />
                          تحديث
                        </button>
                      </div>
                      {loadingInstalled ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      ) : installedModels.length === 0 ? (
                        <div className="text-center text-[11px] text-muted-foreground py-4">
                          لا توجد نماذج مثبتة، أو Ollama غير متصل
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {installedModels.map(m => (
                            <div key={m.name} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/60">
                              <Brain className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold font-mono truncate">{m.name}</div>
                                <div className="text-[9px] text-muted-foreground">
                                  {m.size > 0 ? `${(m.size / 1e9).toFixed(1)} GB` : "—"}
                                </div>
                              </div>
                              <button
                                onClick={() => { setModel(m.name); toast({ description: `تم اختيار ${m.name}` }); }}
                                className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-bold"
                              >
                                استخدام
                              </button>
                              <button
                                onClick={() => deleteModel(m.name)}
                                disabled={deletingModel === m.name}
                                className="text-[10px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                              >
                                {deletingModel === m.name ? <Loader2 className="w-3 h-3 animate-spin" /> : "حذف"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={testConnection}
            disabled={testStatus === "testing"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background/60 hover:bg-accent disabled:opacity-50 text-[12px] font-semibold transition-colors"
          >
            {testStatus === "testing" ? <Wifi className="w-3.5 h-3.5 animate-pulse text-primary" /> : <Wifi className="w-3.5 h-3.5 text-muted-foreground" />}
            اختبار الاتصال
          </button>
          <button
            onClick={detectModels}
            disabled={detecting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background/60 hover:bg-accent disabled:opacity-50 text-[12px] font-semibold transition-colors"
          >
            {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />}
            اكتشاف النماذج
          </button>
          {testStatus === "ok" && <div className="flex items-center gap-1 text-[12px] text-green-400"><CheckCircle2 className="w-3.5 h-3.5" />{testMsg}</div>}
          {testStatus === "fail" && <div className="flex items-center gap-1 text-[12px] text-red-400"><AlertCircle className="w-3.5 h-3.5" />{testMsg}</div>}
          {testStatus === "testing" && <div className="text-[12px] text-muted-foreground animate-pulse">جارٍ الاختبار...</div>}
        </div>

        {/* Save Button */}
        <button
          onClick={save}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-bold transition-colors"
        >
          حفظ الإعدادات وتطبيقها
        </button>

        {/* Setup Guides */}
        <div className="rounded-xl border border-border bg-background/40 p-4 space-y-4 text-[12px]">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-primary" /> دليل الإعداد السريع
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Ollama", color: "text-cyan-400", steps: ["تثبيت من ollama.com", "ollama run dolphin-mixtral", "OLLAMA_ORIGINS=* ollama serve"], url: "https://ollama.com/library" },
              { name: "LM Studio", color: "text-violet-400", steps: ["تحميل من lmstudio.ai", "تحميل نموذج Dolphin/Mistral", "تشغيل Local API Server (منفذ 1234)"], url: "https://lmstudio.ai" },
              { name: "Jan", color: "text-emerald-400", steps: ["تحميل من jan.ai", "تحميل النموذج", "تشغيل Local API (منفذ 1337)"], url: "https://jan.ai" },
              { name: "text-gen-webui", color: "text-amber-400", steps: ["python server.py --api", "تفعيل --extensions openai", "API جاهز على منفذ 5000"], url: "https://github.com/oobabooga/text-generation-webui" },
            ].map((srv) => (
              <div key={srv.name} className="space-y-2">
                <div className={`font-semibold ${srv.color}`}>{srv.name}</div>
                <div className="text-muted-foreground space-y-1">
                  {srv.steps.map((s, i) => <div key={i}>{i + 1}. <code className="bg-background px-1 rounded text-[11px]">{s}</code></div>)}
                </div>
                <a href={srv.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-[10px]">
                  <ExternalLink className="w-3 h-3" /> {srv.url.split("//")[1]}
                </a>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-400/5 border border-amber-400/20 text-amber-300/90">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>ملاحظة: النموذج المحلي يعمل على جهازك فقط. تأكد أن متصفحك يسمح بالاتصال بـ localhost.</div>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-[11px]">
              <Download className="w-3 h-3" /> تصفح مكتبة Ollama الكاملة
            </a>
            <span className="text-muted-foreground/40">·</span>
            <a href="https://huggingface.co/models?sort=trending&library=gguf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-[11px]">
              <Download className="w-3 h-3" /> نماذج GGUF على HuggingFace
            </a>
          </div>
        </div>
        </div>
      </div>
    </FullPageOverlay>
  );
}
