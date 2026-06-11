import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ChatView } from "./components/ChatView";
import { PricingView } from "./components/PricingView";
import { AITerminal } from "./components/AITerminal";
import { StoreProvider, useStore } from "./lib/store";
import { checkAndExpireSubscription } from "./lib/subscription";
import { ApiAccessModal } from "./components/modals/ApiAccessModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { AccountModal } from "./components/modals/AccountModal";
import { ToolModal } from "./components/modals/ToolModal";
import { UtilityToolModal, type UtilityTool } from "./components/modals/UtilityToolModal";
import { ToolsHubModal } from "./components/modals/ToolsHubModal";
import { ShortcutsModal } from "./components/modals/ShortcutsModal";
import { CommandPalette } from "./components/CommandPalette";
import { MemoryModal } from "./components/modals/MemoryModal";
import { BookmarksModal } from "./components/modals/BookmarksModal";
import { SearchModal } from "./components/modals/SearchModal";
import { CompareView } from "./components/CompareView";
import { FloatingActionDock } from "./components/FloatingActionDock";
import { PersonaEditorModal } from "./components/modals/PersonaEditorModal";
import { LocalModelModal } from "./components/modals/LocalModelModal";
import { ProviderSettingsModal } from "./components/modals/ProviderSettingsModal";
import { OsintDashboard } from "./components/modals/OsintDashboard";
import { AdminPanel } from "./components/modals/AdminPanel";
import { ActivateModal } from "./components/modals/ActivateModal";
import { AgentModal } from "./components/modals/AgentModal";
import { NexusModal } from "./components/modals/NexusModal";
import { ArsenalHubModal, type ArsenalModuleId } from "./components/modals/ArsenalHubModal";
import { JarvisModal } from "./components/modals/JarvisModal";
import { ParseltongueModal } from "./components/modals/ParseltongueModal";
import { RagModal } from "./components/modals/RagModal";
import { TeamAgentModal } from "./components/modals/TeamAgentModal";
import { SkillsLibraryModal } from "./components/modals/SkillsLibraryModal";
import { OpenGravityModal } from "./components/modals/OpenGravityModal";
import { AgentOSModal } from "./components/modals/AgentOSModal";
import { GeminiCLIModal } from "./components/modals/GeminiCLIModal";
import { PipelineHUD } from "./components/PipelineHUD";
import type { PipelineItem } from "./lib/pipeline";
// New Arsenal modules — batch 1
import { HermesModal } from "./components/modals/HermesModal";
import { GraphifyModal } from "./components/modals/GraphifyModal";
import { GetShitDoneModal } from "./components/modals/GetShitDoneModal";
import { CCSwitchModal } from "./components/modals/CCSwitchModal";
import { UIUXProModal } from "./components/modals/UIUXProModal";
import { CareerOpsModal } from "./components/modals/CareerOpsModal";
import { ABTopModal } from "./components/modals/ABTopModal";
import { AwesomeLLMModal } from "./components/modals/AwesomeLLMModal";
// New Arsenal modules — batch 2 (from uploaded ZIPs)
import { OsintScannerModal } from "./components/modals/OsintScannerModal";
import { NanoBotModal } from "./components/modals/NanoBotModal";
import { AgentKanbanModal } from "./components/modals/AgentKanbanModal";
import { AutoBEModal } from "./components/modals/AutoBEModal";
import { SuperpowersModal } from "./components/modals/SuperpowersModal";
import { LerimCLIModal } from "./components/modals/LerimCLIModal";
import { ClaudePromptsModal } from "./components/modals/ClaudePromptsModal";
import { RunVSAgentModal } from "./components/modals/RunVSAgentModal";
import { CodexMobileModal } from "./components/modals/CodexMobileModal";
import { OpenACPModal } from "./components/modals/OpenACPModal";
import { HandClawModal } from "./components/modals/HandClawModal";
import { RalphAgentModal } from "./components/modals/RalphAgentModal";
import { BurnBabyBurnModal } from "./components/modals/BurnBabyBurnModal";
import { CrushModal } from "./components/modals/CrushModal";
import { RTKModal } from "./components/modals/RTKModal";
import { CodexBarModal } from "./components/modals/CodexBarModal";
import { CodexSaverModal } from "./components/modals/CodexSaverModal";
import { AgentMemoryModal } from "./components/modals/AgentMemoryModal";
import { DecepticonModal } from "./components/modals/DecepticonModal";
import { DroidDeskModal } from "./components/modals/DroidDeskModal";
import { BugHunterModal } from "./components/modals/BugHunterModal";
import { HyperResearchModal } from "./components/modals/HyperResearchModal";
import { AIFactoryModal } from "./components/modals/AIFactoryModal";
import { GemmaChatModal } from "./components/modals/GemmaChatModal";
import { CodeGraphModal } from "./components/modals/CodeGraphModal";
import { OhMyPiModal } from "./components/modals/OhMyPiModal";
import { AwesomeOpenCodeModal } from "./components/modals/AwesomeOpenCodeModal";
// New Arsenal modules — batch 4 (OpenRepLove / Dyad / Ghostwriter / AgentScope / InsForge)
import { OpenRepLoveModal } from "./components/modals/OpenRepLoveModal";
import { DyadModal } from "./components/modals/DyadModal";
import { GhostwriterModal } from "./components/modals/GhostwriterModal";
import { AgentScopeModal } from "./components/modals/AgentScopeModal";
import { InsForgeModal } from "./components/modals/InsForgeModal";
import { MalwareArsenalModal } from "./components/modals/MalwareArsenalModal";
import { ThreatIntelModal } from "./components/modals/ThreatIntelModal";
import { WormGPTModal } from "./components/modals/WormGPTModal";
// New Arsenal modules — batch 5 (AntigravityMgr, AxonHub, BigAGI, HackingTool, G0DM0D3, GeminiResearch, OpenAntigravity)
import { AntigravityManagerModal } from "./components/modals/AntigravityManagerModal";
import { AxonHubModal } from "./components/modals/AxonHubModal";
import { BigAGIModal } from "./components/modals/BigAGIModal";
import { HackingToolModal } from "./components/modals/HackingToolModal";
import { GodMod3Modal } from "./components/modals/GodMod3Modal";
import { GeminiResearchModal } from "./components/modals/GeminiResearchModal";
import { OpenAntigravityModal } from "./components/modals/OpenAntigravityModal";
import { ChangelogModal } from "./components/modals/ChangelogModal";
import { UseCaseLibraryModal } from "./components/modals/UseCaseLibraryModal";
import { DeepSearchModal } from "./components/modals/DeepSearchModal";
import { ChainInvestigationModal } from "./components/modals/ChainInvestigationModal";
// New modules from uploaded files
import { PaseoModal } from "./components/modals/PaseoModal";
import { GemmaLibModal } from "./components/modals/GemmaLibModal";
import { RogueMasterModal } from "./components/modals/RogueMasterModal";
import { PasswordAttackModal } from "./components/modals/PasswordAttackModal";
import { AIHackingSkillsModal } from "./components/modals/AIHackingSkillsModal";
import { AITerminalModal } from "./components/modals/AITerminalModal";
// Batch 7 — new ZIPs
import { MarkXXXIXModal } from "./components/modals/MarkXXXIXModal";
import { MarkXXXIXORModal } from "./components/modals/MarkXXXIXORModal";
import { FreeLLMAPIModal } from "./components/modals/FreeLLMAPIModal";
import { NineRouterModal } from "./components/modals/NineRouterModal";
import { FeynmanModal } from "./components/modals/FeynmanModal";
import { GovernorModal } from "./components/modals/GovernorModal";
import { HeadroomModal } from "./components/modals/HeadroomModal";
import { TokenOptimizerModal } from "./components/modals/TokenOptimizerModal";
import { ClaudeCodeMemoryModal } from "./components/modals/ClaudeCodeMemoryModal";
// New native modules — Security Kanban + Network Monitor
import { SecurityKanbanModal } from "./components/modals/SecurityKanbanModal";
import { NetworkMonitorModal } from "./components/modals/NetworkMonitorModal";
// Arsenal full-page system
import { ArsenalFullPage } from "./components/ArsenalFullPage";
import { QRSyncModal, useQRSyncImport } from "./components/modals/QRSyncModal";
import { ModelCompareModal } from "./components/modals/ModelCompareModal";
import { NeuralMatrixModal } from "./components/modals/NeuralMatrixModal";
import { ShellGeneratorModal } from "./components/modals/ShellGeneratorModal";
import { AnalyticsDashboard } from "./components/modals/AnalyticsDashboard";
import { MonacoEditorModal } from "./components/modals/MonacoEditorModal";
import { DefensiveAIModal } from "./components/modals/DefensiveAIModal";
import { OpenSkynetModal } from "./components/modals/OpenSkynetModal";
import { WarRoomModal } from "./components/modals/WarRoomModal";
import { RedTeamDashboard } from "./components/modals/RedTeamDashboard";
import { ExploitChainModal } from "./components/modals/ExploitChainModal";
import { CyberHeatmapHUD } from "./components/CyberHeatmapHUD";
import { CyberWidgetsDock } from "./components/CyberWidgetsDock";
import { SystemStatusWidget } from "./components/SystemStatusWidget";
import { AmbientParticleField } from "./components/AmbientParticleField";
import { HoloDataStream } from "./components/HoloDataStream";
import { IntelligenceCoreModal } from "./components/modals/IntelligenceCoreModal";
// Batch 10 — Futuristic 3D Features
import { ThreatGlobeModal } from "./components/modals/ThreatGlobeModal";
import { VulnGraph3DModal } from "./components/modals/VulnGraph3DModal";
import { LiveCodingModal } from "./components/modals/LiveCodingModal";
import { ExploitSandboxModal } from "./components/modals/ExploitSandboxModal";
import { GestureControlModal } from "./components/modals/GestureControlModal";
import { NeuralVoiceModal } from "./components/modals/NeuralVoiceModal";
import { BlockchainAuditModal } from "./components/modals/BlockchainAuditModal";
import { E2ESessionModal } from "./components/modals/E2ESessionModal";
import { AutonomousRedTeamModal } from "./components/modals/AutonomousRedTeamModal";
import { CyberVisionModal } from "./components/modals/CyberVisionModal";
import { JITExploitModal } from "./components/modals/JITExploitModal";
import { EvasionEngineModal } from "./components/modals/EvasionEngineModal";
import { VulnTopologyModal } from "./components/modals/VulnTopologyModal";
import { PrecisionStrikeModal } from "./components/modals/PrecisionStrikeModal";
import { LiveCVEModal } from "./components/modals/LiveCVEModal";
import { BASSimulationModal } from "./components/modals/BASSimulationModal";
import { NetworkTopoModal } from "./components/modals/NetworkTopoModal";
import { BinaryAnalysisModal } from "./components/modals/BinaryAnalysisModal";
import { WebFuzzingModal } from "./components/modals/WebFuzzingModal";
import { MultiAgentSOCModal } from "./components/modals/MultiAgentSOCModal";
import { OrchestrationEngineModal } from "./components/modals/OrchestrationEngineModal";
import { GlobalVulnHeatmapModal } from "./components/modals/GlobalVulnHeatmapModal";
import { CyberWarfareMatrixModal } from "./components/modals/CyberWarfareMatrixModal";
import { SentientCyberSphereModal } from "./components/modals/SentientCyberSphereModal";

const queryClient = new QueryClient();

const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

function AppContent() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const { t } = useT();
  const konamiRef = useRef<string[]>([]);
  const [godMode, setGodMode] = useState(false);

  // Check subscription expiry on mount and every minute
  useEffect(() => {
    function check() {
      const subRaw = localStorage.getItem("mr7-ai-state-v2");
      if (!subRaw) return;
      try {
        const parsed = JSON.parse(subRaw);
        const sub = parsed?.subscription;
        if (!sub) return;
        const expired = checkAndExpireSubscription(sub);
        if (expired) {
          dispatch({ type: "SET_SUBSCRIPTION", patch: expired });
          toast({ description: "Your subscription has expired. You have been moved to the Free plan." });
        }
      } catch { /* ignore */ }
    }
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKonami(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = ["INPUT", "TEXTAREA"].includes(target?.tagName) || target?.isContentEditable;
      if (inField) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konamiRef.current = [...konamiRef.current, k].slice(-KONAMI.length);
      if (KONAMI.every((kk, i) => konamiRef.current[i] === kk)) {
        konamiRef.current = [];
        setGodMode(true);
        toast({ description: t("toast.godmodeUnlocked") });
        setTimeout(() => setGodMode(false), 4500);
      }
    }
    document.addEventListener("keydown", onKonami);
    return () => document.removeEventListener("keydown", onKonami);
  }, [toast, t]);

  // ── QR sync: auto-import on ?sync= param ────────────────────────────────────
  useQRSyncImport();

  // ── Full-page Arsenal view state ────────────────────────────────────────────
  const [arsenalPage, setArsenalPage] = useState<ArsenalModuleId | "ai-terminal" | null>(null);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [localModelOpen, setLocalModelOpen] = useState(false);
  const [providerSettingsOpen, setProviderSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toolsHubOpen, setToolsHubOpen] = useState(false);
  const [utility, setUtility] = useState<UtilityTool | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [osintDashOpen, setOsintDashOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [nexusOpen, setNexusOpen] = useState(false);
  const [arsenalOpen, setArsenalOpen] = useState(false);
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const [parseltongueOpen, setParseltongueOpen] = useState(false);
  const [ragOpen, setRagOpen] = useState(false);
  const [teamAgentOpen, setTeamAgentOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [openGravityOpen, setOpenGravityOpen] = useState(false);
  const [agentOSOpen, setAgentOSOpen] = useState(false);
  const [geminiCLIOpen, setGeminiCLIOpen] = useState(false);
  // New modules — batch 1
  const [hermesOpen, setHermesOpen] = useState(false);
  const [graphifyOpen, setGraphifyOpen] = useState(false);
  const [getShitDoneOpen, setGetShitDoneOpen] = useState(false);
  const [ccswitchOpen, setCcswitchOpen] = useState(false);
  const [uiuxproOpen, setUiuxproOpen] = useState(false);
  const [careerOpsOpen, setCareerOpsOpen] = useState(false);
  const [abTopOpen, setAbTopOpen] = useState(false);
  const [awesomeLLMOpen, setAwesomeLLMOpen] = useState(false);
  // New modules — batch 2 (from uploaded ZIPs)
  const [osintScannerOpen, setOsintScannerOpen] = useState(false);
  const [nanoBotOpen, setNanoBotOpen] = useState(false);
  const [agentKanbanOpen, setAgentKanbanOpen] = useState(false);
  const [autoBEOpen, setAutoBEOpen] = useState(false);
  const [superpowersOpen, setSuperpowersOpen] = useState(false);
  const [lerimCLIOpen, setLerimCLIOpen] = useState(false);
  const [claudePromptsOpen, setClaudePromptsOpen] = useState(false);
  const [runVSAgentOpen, setRunVSAgentOpen] = useState(false);
  const [codexMobileOpen, setCodexMobileOpen] = useState(false);
  const [openACPOpen, setOpenACPOpen] = useState(false);
  const [handClawOpen, setHandClawOpen] = useState(false);
  const [ralphOpen, setRalphOpen] = useState(false);
  const [burnbabyOpen, setBurnbabyOpen] = useState(false);
  const [crushOpen, setCrushOpen] = useState(false);
  const [rtkOpen, setRtkOpen] = useState(false);
  // New modules — batch 3 (latest uploaded ZIPs)
  const [codexBarOpen, setCodexBarOpen] = useState(false);
  const [codexSaverOpen, setCodexSaverOpen] = useState(false);
  const [agentMemoryOpen, setAgentMemoryOpen] = useState(false);
  const [decepticonOpen, setDecepticonOpen] = useState(false);
  const [droidDeskOpen, setDroidDeskOpen] = useState(false);
  const [bugHunterOpen, setBugHunterOpen] = useState(false);
  const [hyperResearchOpen, setHyperResearchOpen] = useState(false);
  const [aiFactoryOpen, setAIFactoryOpen] = useState(false);
  const [gemmaChatOpen, setGemmaChatOpen] = useState(false);
  const [codeGraphOpen, setCodeGraphOpen] = useState(false);
  const [ohMyPiOpen, setOhMyPiOpen] = useState(false);
  const [awesomeOpenCodeOpen, setAwesomeOpenCodeOpen] = useState(false);
  // New modules — batch 4
  const [openRepLoveOpen, setOpenRepLoveOpen] = useState(false);
  const [dyadOpen, setDyadOpen] = useState(false);
  const [ghostwriterOpen, setGhostwriterOpen] = useState(false);
  const [agentScopeOpen, setAgentScopeOpen] = useState(false);
  const [insForgeOpen, setInsForgeOpen] = useState(false);
  const [malwareArsenalOpen, setMalwareArsenalOpen] = useState(false);
  const [threatIntelOpen, setThreatIntelOpen] = useState(false);
  const [wormGPTOpen, setWormGPTOpen] = useState(false);
  // New modules — batch 5
  const [antigravityMgrOpen, setAntigravityMgrOpen] = useState(false);
  const [axonHubOpen, setAxonHubOpen] = useState(false);
  const [bigAGIOpen, setBigAGIOpen] = useState(false);
  const [hackingToolOpen, setHackingToolOpen] = useState(false);
  const [godMod3Open, setGodMod3Open] = useState(false);
  const [geminiResearchOpen, setGeminiResearchOpen] = useState(false);
  const [openAntigravityOpen, setOpenAntigravityOpen] = useState(false);
  const [paseoOpen, setPaseoOpen] = useState(false);
  const [gemmaLibOpen, setGemmaLibOpen] = useState(false);
  const [rogueMasterOpen, setRogueMasterOpen] = useState(false);
  const [passwordAttackOpen, setPasswordAttackOpen] = useState(false);
  const [aiHackingSkillsOpen, setAIHackingSkillsOpen] = useState(false);
  const [aiTerminalOpen, setAiTerminalOpen] = useState(false);
  // New modules — batch 7
  const [markXXXIXOpen, setMarkXXXIXOpen] = useState(false);
  const [markXXXIXOROpen, setMarkXXXIXOROpen] = useState(false);
  const [freeLLMAPIOpen, setFreeLLMAPIOpen] = useState(false);
  const [nineRouterOpen, setNineRouterOpen] = useState(false);
  const [feynmanOpen, setFeynmanOpen] = useState(false);
  const [governorOpen, setGovernorOpen] = useState(false);
  const [headroomOpen, setHeadroomOpen] = useState(false);
  const [tokenOptimizerOpen, setTokenOptimizerOpen] = useState(false);
  const [claudeMemoryOpen, setClaudeMemoryOpen] = useState(false);
  const [qrSyncOpen, setQrSyncOpen] = useState(false);
  const [modelCompareOpen, setModelCompareOpen] = useState(false);
  const [securityKanbanOpen, setSecurityKanbanOpen] = useState(false);
  const [networkMonitorOpen, setNetworkMonitorOpen] = useState(false);
  const [defensiveAIOpen, setDefensiveAIOpen] = useState(false);
  const [openSkynetOpen, setOpenSkynetOpen] = useState(false);
  const [neuralMatrixOpen, setNeuralMatrixOpen] = useState(false);
  const [shellGeneratorOpen, setShellGeneratorOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [monacoOpen, setMonacoOpen] = useState(false);
  const [monacoInitCode, setMonacoInitCode] = useState<string | undefined>();
  const [monacoInitLang, setMonacoInitLang] = useState<string | undefined>();
  const [shellGeneratorInject, setShellGeneratorInject] = useState<string | undefined>();
  const [warRoomOpen, setWarRoomOpen] = useState(false);
  const [exploitChainOpen, setExploitChainOpen] = useState(false);
  const [deepSearchOpen, setDeepSearchOpen] = useState(false);
  const [chainInvestigationOpen, setChainInvestigationOpen] = useState(false);
  const [redTeamDashOpen, setRedTeamDashOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [useCaseLibOpen, setUseCaseLibOpen] = useState(false);
  const [intelligenceCoreOpen, setIntelligenceCoreOpen] = useState(false);
  // Batch 10 — Futuristic 3D Features
  const [threatGlobeOpen, setThreatGlobeOpen] = useState(false);
  const [vulnGraph3DOpen, setVulnGraph3DOpen] = useState(false);
  const [liveCodingOpen, setLiveCodingOpen] = useState(false);
  const [exploitSandboxOpen, setExploitSandboxOpen] = useState(false);
  const [gestureControlOpen, setGestureControlOpen] = useState(false);
  const [neuralVoiceOpen, setNeuralVoiceOpen] = useState(false);
  const [blockchainAuditOpen, setBlockchainAuditOpen] = useState(false);
  const [e2eSessionOpen, setE2ESessionOpen] = useState(false);
  const [autonomousRedTeamOpen, setAutonomousRedTeamOpen] = useState(false);
  const [cyberVisionOpen, setCyberVisionOpen] = useState(false);
  const [jitExploitOpen, setJITExploitOpen] = useState(false);
  const [evasionEngineOpen, setEvasionEngineOpen] = useState(false);
  const [vulnTopologyOpen, setVulnTopologyOpen] = useState(false);
  const [precisionStrikeOpen, setPrecisionStrikeOpen] = useState(false);
  const [liveCVEOpen, setLiveCVEOpen] = useState(false);
  const [basSimulationOpen, setBASSimulationOpen] = useState(false);
  const [networkTopoOpen, setNetworkTopoOpen] = useState(false);
  const [binaryAnalysisOpen, setBinaryAnalysisOpen] = useState(false);
  const [webFuzzingOpen, setWebFuzzingOpen] = useState(false);
  const [multiAgentSOCOpen, setMultiAgentSOCOpen] = useState(false);
  const [orchestrationEngineOpen, setOrchestrationEngineOpen] = useState(false);
  const [globalVulnHeatmapOpen, setGlobalVulnHeatmapOpen] = useState(false);
  const [cyberWarfareMatrixOpen, setCyberWarfareMatrixOpen] = useState(false);
  const [sentientCyberSphereOpen, setSentientCyberSphereOpen] = useState(false);

  const [pipelineKeyRef] = useState(() => ({ n: 0 }));
  const [ragPipelineDoc, setRagPipelineDoc] = useState<{ text: string; name: string; key: number } | undefined>();
  const [agentPipelineTask, setAgentPipelineTask] = useState<{ text: string; key: number } | undefined>();
  const [cliPipelineContext, setCliPipelineContext] = useState<{ text: string; key: number } | undefined>();
  const [idePipelineCode, setIdePipelineCode] = useState<{ text: string; key: number } | undefined>();

  function nextKey() { return ++pipelineKeyRef.n; }

  function handlePipeToRag(item: PipelineItem) {
    setRagPipelineDoc({ text: item.content, name: `[${item.source}] ${item.label}`, key: nextKey() });
    setRagOpen(true);
  }
  function handlePipeToCLI(item: PipelineItem) {
    setCliPipelineContext({ text: item.content, key: nextKey() });
    setGeminiCLIOpen(true);
  }
  function handlePipeToAgent(item: PipelineItem) {
    setAgentPipelineTask({ text: item.content, key: nextKey() });
    setAgentOpen(true);
  }
  function handlePipeToIDE(item: PipelineItem) {
    setIdePipelineCode({ text: item.content, key: nextKey() });
    setOpenGravityOpen(true);
  }

  function handleArsenalLaunch(id: ArsenalModuleId) {
    setArsenalOpen(false);
    if (id === "ai-terminal") {
      setAiTerminalOpen(true);
    } else if (id === "securitykanban") {
      setSecurityKanbanOpen(true);
    } else if (id === "networkmonitor") {
      setNetworkMonitorOpen(true);
    } else if (id === "defensiveai") {
      setDefensiveAIOpen(true);
    } else if (id === "openskynet") {
      setOpenSkynetOpen(true);
    } else if (id === "threatglobe") {
      setThreatGlobeOpen(true);
    } else if (id === "vulngraph3d") {
      setVulnGraph3DOpen(true);
    } else if (id === "livecoding") {
      setLiveCodingOpen(true);
    } else if (id === "exploitsandbox") {
      setExploitSandboxOpen(true);
    } else if (id === "gesturecontrol") {
      setGestureControlOpen(true);
    } else if (id === "neuralvoice") {
      setNeuralVoiceOpen(true);
    } else if (id === "blockchainaudit") {
      setBlockchainAuditOpen(true);
    } else if (id === "e2esession") {
      setE2ESessionOpen(true);
    } else if (id === "autonomousredteam") {
      setAutonomousRedTeamOpen(true);
    } else if (id === "cybervision") {
      setCyberVisionOpen(true);
    } else if (id === "jitexploit") {
      setJITExploitOpen(true);
    } else if (id === "evasionengine") {
      setEvasionEngineOpen(true);
    } else if (id === "vulntopology") {
      setVulnTopologyOpen(true);
    } else if (id === "precisionstrike") {
      setPrecisionStrikeOpen(true);
    } else if (id === "livecve") {
      setLiveCVEOpen(true);
    } else if (id === "bassimulation") {
      setBASSimulationOpen(true);
    } else if (id === "networktopo") {
      setNetworkTopoOpen(true);
    } else if (id === "binaryanalysis") {
      setBinaryAnalysisOpen(true);
    } else if (id === "webfuzzing") {
      setWebFuzzingOpen(true);
    } else if (id === "multiagentsoc") {
      setMultiAgentSOCOpen(true);
    } else if (id === "orchestrationengine") {
      setOrchestrationEngineOpen(true);
    } else if (id === "globalvulnheatmap") {
      setGlobalVulnHeatmapOpen(true);
    } else if (id === "cyberwarfarematrix") {
      setCyberWarfareMatrixOpen(true);
    } else if (id === "sentientcybersphere") {
      setSentientCyberSphereOpen(true);
    } else {
      setArsenalPage(id);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = ["INPUT", "TEXTAREA"].includes(target?.tagName) || target?.isContentEditable;
      if (!inField && e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
      if (!inField && (e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        dispatch({ type: "NEW_CHAT" });
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (!inField && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setToolsHubOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (!inField && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setMemoryOpen((v) => !v);
      }
      if (!inField && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setBookmarksOpen((v) => !v);
      }
      if (!inField && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setCompareOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setAdminOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setMonacoOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setExploitChainOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a" && !e.altKey) {
        e.preventDefault();
        setAnalyticsOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setOsintDashOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        setChangelogOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setUseCaseLibOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIntelligenceCoreOpen(v => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dispatch]);

  function handlePaletteAction(action: string, payload?: string) {
    setPaletteOpen(false);
    switch (action) {
      case "new-chat":       dispatch({ type: "NEW_CHAT" }); break;
      case "open-pricing":   setPricingOpen(true); break;
      case "open-api":       setApiOpen(true); break;
      case "open-settings":  setSettingsOpen(true); break;
      case "open-shortcuts": setShortcutsOpen(true); break;
      case "set-model":      if (payload) dispatch({ type: "SET_MODEL", model: payload }); break;
      case "set-persona":    dispatch({ type: "SET_PERSONA", persona: payload || null }); break;
      case "open-tools":     setToolsHubOpen(true); break;
      case "select-chat":    if (payload) dispatch({ type: "SELECT_CHAT", id: payload }); break;
    }
  }

  // suppress unused state warning
  void state;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden text-foreground selection:bg-primary/30 dark">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenPricing={() => setPricingOpen(true)}
        onOpenApi={() => setApiOpen(true)}
        onOpenTool={() => setToolOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenUtility={(name) => setUtility(name)}
        onOpenToolsHub={() => setToolsHubOpen(true)}
        onOpenMemory={() => setMemoryOpen(true)}
        onOpenBookmarks={() => setBookmarksOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenCompare={() => setCompareOpen(true)}
        onOpenQRSync={() => setQrSyncOpen(true)}
        onOpenChangelog={() => setChangelogOpen(true)}
        onOpenOsint={() => setOsintDashOpen(true)}
        onOpenUseCaseLib={() => setUseCaseLibOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          onOpenPricing={() => setPricingOpen(true)}
          onOpenToolsHub={() => setToolsHubOpen(true)}
          onOpenHelp={() => setShortcutsOpen(true)}
          onOpenPersonaEditor={() => setPersonaEditorOpen(true)}
          onOpenLocalModel={() => setLocalModelOpen(true)}
          onOpenAgent={() => setAgentOpen(true)}
          onOpenNexus={() => setNexusOpen(true)}
          onOpenArsenal={() => setArsenalOpen(true)}
          onOpenProviderSettings={() => setProviderSettingsOpen(true)}
          onOpenModelCompare={() => setModelCompareOpen(true)}
          onOpenNeuralMatrix={() => setNeuralMatrixOpen(true)}
          onOpenAnalytics={() => setAnalyticsOpen(true)}
          onOpenWarRoom={() => setWarRoomOpen(true)}
          onOpenDeepSearch={() => setDeepSearchOpen(true)}
          onOpenChainInvestigation={() => setChainInvestigationOpen(true)}
          onOpenRedTeam={() => setRedTeamDashOpen(true)}
        />
        <ChatView onOpenOsintDash={() => setOsintDashOpen(true)} />
        {compareOpen && <CompareView onClose={() => setCompareOpen(false)} />}
      </main>

      {/* Arsenal full-page overlays */}
      <AnimatePresence>
        {arsenalPage === "ai-terminal" && (
          <div className="fixed inset-0 z-40">
            <AITerminal onBack={() => setArsenalPage(null)} />
          </div>
        )}
        {arsenalPage && arsenalPage !== "ai-terminal" && (
          <ArsenalFullPage moduleId={arsenalPage} onBack={() => setArsenalPage(null)} />
        )}
      </AnimatePresence>

      <FloatingActionDock
        onNewChat={() => dispatch({ type: "NEW_CHAT" })}
        onSearch={() => setSearchOpen(true)}
        onMemory={() => setMemoryOpen(true)}
        onBookmarks={() => setBookmarksOpen(true)}
        onCompare={() => setCompareOpen(true)}
        onTools={() => setToolsHubOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onHelp={() => setShortcutsOpen(true)}
        onAgent={() => setAgentOpen(true)}
      />

      {pricingOpen && <PricingView onClose={() => setPricingOpen(false)} />}
      <ApiAccessModal open={apiOpen} onOpenChange={setApiOpen} />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AccountModal open={accountOpen} onOpenChange={setAccountOpen} onUpgrade={() => { setAccountOpen(false); setPricingOpen(true); }} />
      <ToolModal open={toolOpen} onOpenChange={setToolOpen} />
      <UtilityToolModal tool={utility} onOpenChange={(v) => { if (!v) setUtility(null); }} />
      <ToolsHubModal open={toolsHubOpen} onOpenChange={setToolsHubOpen} onSelect={(t) => setUtility(t)} />
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onAction={handlePaletteAction} />
      <MemoryModal open={memoryOpen} onOpenChange={setMemoryOpen} />
      <BookmarksModal open={bookmarksOpen} onOpenChange={setBookmarksOpen} />
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <PersonaEditorModal open={personaEditorOpen} onOpenChange={setPersonaEditorOpen} />
      <LocalModelModal open={localModelOpen} onOpenChange={setLocalModelOpen} />
      <ProviderSettingsModal open={providerSettingsOpen} onClose={() => setProviderSettingsOpen(false)} />
      <OsintDashboard open={osintDashOpen} onOpenChange={setOsintDashOpen} />
      <ChangelogModal open={changelogOpen} onOpenChange={setChangelogOpen} />
      <UseCaseLibraryModal open={useCaseLibOpen} onOpenChange={setUseCaseLibOpen} />
      <AdminPanel open={adminOpen} onOpenChange={setAdminOpen} />
      <ActivateModal open={activateOpen} onOpenChange={setActivateOpen} />
      <QRSyncModal open={qrSyncOpen} onClose={() => setQrSyncOpen(false)} />
      <ModelCompareModal open={modelCompareOpen} onClose={() => setModelCompareOpen(false)} />
      <NeuralMatrixModal open={neuralMatrixOpen} onOpenChange={setNeuralMatrixOpen} />
      <AgentModal open={agentOpen} onOpenChange={setAgentOpen} pipelineTask={agentPipelineTask} />
      <NexusModal open={nexusOpen} onOpenChange={setNexusOpen} />
      <ArsenalHubModal open={arsenalOpen} onOpenChange={setArsenalOpen} onLaunch={handleArsenalLaunch} />
      <JarvisModal open={jarvisOpen} onOpenChange={setJarvisOpen} />
      <ParseltongueModal open={parseltongueOpen} onOpenChange={setParseltongueOpen} />
      <RagModal open={ragOpen} onOpenChange={setRagOpen} pipelineDoc={ragPipelineDoc} />
      <TeamAgentModal open={teamAgentOpen} onOpenChange={setTeamAgentOpen} />
      <SkillsLibraryModal open={skillsOpen} onOpenChange={setSkillsOpen} />
      <OpenGravityModal open={openGravityOpen} onOpenChange={setOpenGravityOpen} pipelineCode={idePipelineCode} />
      <AgentOSModal open={agentOSOpen} onOpenChange={setAgentOSOpen} />
      <GeminiCLIModal open={geminiCLIOpen} onOpenChange={setGeminiCLIOpen} pipelineContext={cliPipelineContext} />
      {/* New Arsenal modules — batch 1 */}
      <HermesModal open={hermesOpen} onOpenChange={setHermesOpen} />
      <GraphifyModal open={graphifyOpen} onOpenChange={setGraphifyOpen} />
      <GetShitDoneModal open={getShitDoneOpen} onOpenChange={setGetShitDoneOpen} />
      <CCSwitchModal open={ccswitchOpen} onOpenChange={setCcswitchOpen} />
      <UIUXProModal open={uiuxproOpen} onOpenChange={setUiuxproOpen} />
      <CareerOpsModal open={careerOpsOpen} onOpenChange={setCareerOpsOpen} />
      <ABTopModal open={abTopOpen} onOpenChange={setAbTopOpen} />
      <AwesomeLLMModal open={awesomeLLMOpen} onOpenChange={setAwesomeLLMOpen} />
      {/* New Arsenal modules — batch 2 (from uploaded ZIPs) */}
      <OsintScannerModal open={osintScannerOpen} onOpenChange={setOsintScannerOpen} onChainToKali={(content) => { setAgentPipelineTask({ text: content, key: nextKey() }); setAgentOpen(true); }} />
      <NanoBotModal open={nanoBotOpen} onOpenChange={setNanoBotOpen} />
      <AgentKanbanModal open={agentKanbanOpen} onOpenChange={setAgentKanbanOpen} />
      <AutoBEModal open={autoBEOpen} onOpenChange={setAutoBEOpen} />
      <SuperpowersModal open={superpowersOpen} onOpenChange={setSuperpowersOpen} />
      <LerimCLIModal open={lerimCLIOpen} onOpenChange={setLerimCLIOpen} />
      <ClaudePromptsModal open={claudePromptsOpen} onOpenChange={setClaudePromptsOpen} />
      <RunVSAgentModal open={runVSAgentOpen} onOpenChange={setRunVSAgentOpen} />
      <CodexMobileModal open={codexMobileOpen} onOpenChange={setCodexMobileOpen} />
      <OpenACPModal open={openACPOpen} onOpenChange={setOpenACPOpen} />
      <HandClawModal open={handClawOpen} onOpenChange={setHandClawOpen} />
      <RalphAgentModal open={ralphOpen} onOpenChange={setRalphOpen} />
      <BurnBabyBurnModal open={burnbabyOpen} onOpenChange={setBurnbabyOpen} />
      <CrushModal open={crushOpen} onOpenChange={setCrushOpen} />
      <RTKModal open={rtkOpen} onOpenChange={setRtkOpen} />
      {/* New Arsenal modules — batch 3 */}
      <CodexBarModal open={codexBarOpen} onOpenChange={setCodexBarOpen} />
      <CodexSaverModal open={codexSaverOpen} onOpenChange={setCodexSaverOpen} />
      <AgentMemoryModal open={agentMemoryOpen} onOpenChange={setAgentMemoryOpen} />
      <DecepticonModal open={decepticonOpen} onOpenChange={setDecepticonOpen} />
      <DroidDeskModal open={droidDeskOpen} onOpenChange={setDroidDeskOpen} />
      <BugHunterModal open={bugHunterOpen} onOpenChange={setBugHunterOpen} />
      <HyperResearchModal open={hyperResearchOpen} onOpenChange={setHyperResearchOpen} />
      <AIFactoryModal open={aiFactoryOpen} onOpenChange={setAIFactoryOpen} />
      <GemmaChatModal open={gemmaChatOpen} onOpenChange={setGemmaChatOpen} />
      <CodeGraphModal open={codeGraphOpen} onOpenChange={setCodeGraphOpen} />
      <OhMyPiModal open={ohMyPiOpen} onOpenChange={setOhMyPiOpen} />
      <AwesomeOpenCodeModal open={awesomeOpenCodeOpen} onOpenChange={setAwesomeOpenCodeOpen} />
      {/* New Arsenal modules — batch 4 */}
      <OpenRepLoveModal open={openRepLoveOpen} onOpenChange={setOpenRepLoveOpen} />
      <DyadModal open={dyadOpen} onOpenChange={setDyadOpen} />
      <GhostwriterModal open={ghostwriterOpen} onOpenChange={setGhostwriterOpen} />
      <AgentScopeModal open={agentScopeOpen} onOpenChange={setAgentScopeOpen} />
      <InsForgeModal open={insForgeOpen} onOpenChange={setInsForgeOpen} />
      <MalwareArsenalModal open={malwareArsenalOpen} onOpenChange={setMalwareArsenalOpen} />
      <ThreatIntelModal open={threatIntelOpen} onOpenChange={setThreatIntelOpen} />
      <WormGPTModal open={wormGPTOpen} onOpenChange={setWormGPTOpen} />
      {/* New Arsenal modules — batch 5 */}
      <AntigravityManagerModal open={antigravityMgrOpen} onOpenChange={setAntigravityMgrOpen} />
      <AxonHubModal open={axonHubOpen} onOpenChange={setAxonHubOpen} />
      <BigAGIModal open={bigAGIOpen} onOpenChange={setBigAGIOpen} />
      <HackingToolModal open={hackingToolOpen} onOpenChange={setHackingToolOpen} />
      <GodMod3Modal open={godMod3Open} onOpenChange={setGodMod3Open} />
      <GeminiResearchModal open={geminiResearchOpen} onOpenChange={setGeminiResearchOpen} />
      <OpenAntigravityModal open={openAntigravityOpen} onOpenChange={setOpenAntigravityOpen} />
      <PaseoModal open={paseoOpen} onOpenChange={setPaseoOpen} />
      <GemmaLibModal open={gemmaLibOpen} onOpenChange={setGemmaLibOpen} />
      <RogueMasterModal open={rogueMasterOpen} onOpenChange={setRogueMasterOpen} />
      <PasswordAttackModal open={passwordAttackOpen} onOpenChange={setPasswordAttackOpen} />
      <AIHackingSkillsModal open={aiHackingSkillsOpen} onOpenChange={setAIHackingSkillsOpen} />
      <AITerminalModal open={aiTerminalOpen} onOpenChange={setAiTerminalOpen} />
      {/* New Arsenal modules — batch 7 */}
      <MarkXXXIXModal open={markXXXIXOpen} onOpenChange={setMarkXXXIXOpen} />
      <MarkXXXIXORModal open={markXXXIXOROpen} onOpenChange={setMarkXXXIXOROpen} />
      <FreeLLMAPIModal open={freeLLMAPIOpen} onOpenChange={setFreeLLMAPIOpen} />
      <NineRouterModal open={nineRouterOpen} onOpenChange={setNineRouterOpen} />
      <FeynmanModal open={feynmanOpen} onOpenChange={setFeynmanOpen} />
      <GovernorModal open={governorOpen} onOpenChange={setGovernorOpen} />
      <HeadroomModal open={headroomOpen} onOpenChange={setHeadroomOpen} />
      <TokenOptimizerModal open={tokenOptimizerOpen} onOpenChange={setTokenOptimizerOpen} />
      <ClaudeCodeMemoryModal open={claudeMemoryOpen} onOpenChange={setClaudeMemoryOpen} />
      <ShellGeneratorModal open={shellGeneratorOpen} onOpenChange={setShellGeneratorOpen} onInjectToChat={(payload) => { setShellGeneratorInject(payload); }} />
      <AnalyticsDashboard open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <SecurityKanbanModal open={securityKanbanOpen} onOpenChange={setSecurityKanbanOpen} />
      <NetworkMonitorModal open={networkMonitorOpen} onOpenChange={setNetworkMonitorOpen} />
      <DefensiveAIModal open={defensiveAIOpen} onOpenChange={setDefensiveAIOpen} />
      <OpenSkynetModal open={openSkynetOpen} onOpenChange={setOpenSkynetOpen} />
      <WarRoomModal open={warRoomOpen} onOpenChange={setWarRoomOpen} />
      <RedTeamDashboard open={redTeamDashOpen} onOpenChange={setRedTeamDashOpen} />
      <ExploitChainModal open={exploitChainOpen} onOpenChange={setExploitChainOpen} />
      <DeepSearchModal open={deepSearchOpen} onOpenChange={setDeepSearchOpen} />
      <ChainInvestigationModal open={chainInvestigationOpen} onOpenChange={setChainInvestigationOpen} />
      <MonacoEditorModal
        open={monacoOpen}
        onClose={() => setMonacoOpen(false)}
        initialCode={monacoInitCode}
        initialLang={monacoInitLang}
        onSendToChat={(code, lang) => {
          dispatch({ type: "NEW_CHAT" });
          toast({ description: "Code sent to chat." });
        }}
      />
      <PipelineHUD
        onSendToRag={handlePipeToRag}
        onSendToCLI={handlePipeToCLI}
        onSendToAgent={handlePipeToAgent}
        onSendToIDE={handlePipeToIDE}
      />

      {godMode && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-amber-500/10 animate-pulse" />
          <div className="relative bg-card/90 backdrop-blur-md border-2 border-primary rounded-3xl px-8 py-6 shadow-[0_0_60px_rgba(226,18,39,0.5)] text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-primary/80 mb-2">↑↑↓↓←→←→ B A</div>
            <div className="text-3xl font-black bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">GODMODE UNLOCKED</div>
            <div className="text-[12px] text-muted-foreground mt-2">Multi-strategy parallel race available · select Godmode pill in chat</div>
          </div>
        </div>
      )}

      {/* Cyber Attack Heatmap HUD */}
      <CyberHeatmapHUD />

      {/* System Status Widget */}
      <SystemStatusWidget />

      {/* Ambient particle field */}
      <AmbientParticleField density={0.5} />

      {/* Holographic data stream on edges */}
      <HoloDataStream side="both" />

      {/* Cyber Widgets Dock — single 3D button opening holographic 6-panel HUD */}
      <CyberWidgetsDock />


      {/* Intelligence Core — 16 engine modal */}
      <IntelligenceCoreModal open={intelligenceCoreOpen} onOpenChange={setIntelligenceCoreOpen} />
      {/* Batch 10 — Futuristic 3D Features */}
      <ThreatGlobeModal open={threatGlobeOpen} onOpenChange={setThreatGlobeOpen} />
      <VulnGraph3DModal open={vulnGraph3DOpen} onOpenChange={setVulnGraph3DOpen} />
      <LiveCodingModal open={liveCodingOpen} onOpenChange={setLiveCodingOpen} />
      <ExploitSandboxModal open={exploitSandboxOpen} onOpenChange={setExploitSandboxOpen} />
      <GestureControlModal open={gestureControlOpen} onOpenChange={setGestureControlOpen} />
      <NeuralVoiceModal open={neuralVoiceOpen} onOpenChange={setNeuralVoiceOpen} />
      <BlockchainAuditModal open={blockchainAuditOpen} onOpenChange={setBlockchainAuditOpen} />
      <E2ESessionModal open={e2eSessionOpen} onOpenChange={setE2ESessionOpen} />
      <AutonomousRedTeamModal open={autonomousRedTeamOpen} onOpenChange={setAutonomousRedTeamOpen} />
      <CyberVisionModal open={cyberVisionOpen} onOpenChange={setCyberVisionOpen} />
      <JITExploitModal open={jitExploitOpen} onOpenChange={setJITExploitOpen} />
      <EvasionEngineModal open={evasionEngineOpen} onOpenChange={setEvasionEngineOpen} />
      <VulnTopologyModal open={vulnTopologyOpen} onOpenChange={setVulnTopologyOpen} />
      <PrecisionStrikeModal open={precisionStrikeOpen} onOpenChange={setPrecisionStrikeOpen} />
      <LiveCVEModal open={liveCVEOpen} onOpenChange={setLiveCVEOpen} />
      <BASSimulationModal open={basSimulationOpen} onOpenChange={setBASSimulationOpen} />
      <NetworkTopoModal open={networkTopoOpen} onOpenChange={setNetworkTopoOpen} />
      <BinaryAnalysisModal open={binaryAnalysisOpen} onOpenChange={setBinaryAnalysisOpen} />
      <WebFuzzingModal open={webFuzzingOpen} onOpenChange={setWebFuzzingOpen} />
      <MultiAgentSOCModal open={multiAgentSOCOpen} onOpenChange={setMultiAgentSOCOpen} />
      <OrchestrationEngineModal open={orchestrationEngineOpen} onOpenChange={setOrchestrationEngineOpen} />
      <GlobalVulnHeatmapModal open={globalVulnHeatmapOpen} onOpenChange={setGlobalVulnHeatmapOpen} />
      <CyberWarfareMatrixModal open={cyberWarfareMatrixOpen} onOpenChange={setCyberWarfareMatrixOpen} />
      <SentientCyberSphereModal open={sentientCyberSphereOpen} onOpenChange={setSentientCyberSphereOpen} />

      {/* Global HUD scan line — year 3090 effect */}
      <div className="hud-scan-line pointer-events-none" />

      {/* Global hex grid background overlay */}
      <div className="pointer-events-none fixed inset-0 z-[-1] grid-3d opacity-100" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
