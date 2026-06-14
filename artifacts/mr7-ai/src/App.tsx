import { lazy, Suspense, useEffect, useRef, useReducer, useState, useCallback } from "react";
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
import { FloatingActionDock } from "./components/FloatingActionDock";
import { PipelineHUD } from "./components/PipelineHUD";
import type { PipelineItem } from "./lib/pipeline";
import { CompareView } from "./components/CompareView";
import { ArsenalFullPage } from "./components/ArsenalFullPage";
import { QRSyncModal, useQRSyncImport } from "./components/modals/QRSyncModal";
import { AmbientParticleField } from "./components/AmbientParticleField";
import { HoloDataStream } from "./components/HoloDataStream";
import { CyberHUDOverlay } from "./components/CyberWidgetsDock";
import { SystemStatusWidget } from "./components/SystemStatusWidget";
import { CyberHeatmapHUD } from "./components/CyberHeatmapHUD";
import { AIAutoSetup3D } from "./components/AIAutoSetup3D";
import { PerformanceDashboard3D } from "./components/PerformanceDashboard3D";
import { CostDashboard3D, useCostTracker } from "./components/CostDashboard3D";
import { DedupVisualizer3D } from "./components/DedupVisualizer3D";
import { ThreatFeed3D } from "./components/ThreatFeed3D";
import { SecurityDashboard3D } from "./components/SecurityDashboard3D";
import { ContextMemoryPanel3D } from "./components/ContextMemoryPanel3D";
import { PrefetchIntelligence3D } from "./components/PrefetchIntelligence3D";
import { SystemMasterHUD3D } from "./components/SystemMasterHUD3D";
import { AnomalyLog3D } from "./components/AnomalyLog3D";
import { NetworkTopology3D } from "./components/NetworkTopology3D";
import { CisaLivePanel3D, CisaKevAlertToaster } from "./components/CisaLivePanel3D";
import { contextMemory } from "./lib/context-memory";
import { securityLayer } from "./lib/security-layer";
import { prefetchEngine } from "./lib/prefetch-engine";
import type { ArsenalModuleId } from "./components/modals/ArsenalHubModal";
import type { UtilityTool } from "./components/modals/UtilityToolModal";

// ── LAZY MODAL IMPORTS ────────────────────────────────────────────────────────
const ApiAccessModal        = lazy(() => import("./components/modals/ApiAccessModal").then(m=>({default:m.ApiAccessModal})));
const SettingsModal         = lazy(() => import("./components/modals/SettingsModal").then(m=>({default:m.SettingsModal})));
const AccountModal          = lazy(() => import("./components/modals/AccountModal").then(m=>({default:m.AccountModal})));
const ToolModal             = lazy(() => import("./components/modals/ToolModal").then(m=>({default:m.ToolModal})));
const UtilityToolModal      = lazy(() => import("./components/modals/UtilityToolModal").then(m=>({default:m.UtilityToolModal})));
const ToolsHubModal         = lazy(() => import("./components/modals/ToolsHubModal").then(m=>({default:m.ToolsHubModal})));
const ShortcutsModal        = lazy(() => import("./components/modals/ShortcutsModal").then(m=>({default:m.ShortcutsModal})));
const CommandPalette        = lazy(() => import("./components/CommandPalette").then(m=>({default:m.CommandPalette})));
const MemoryModal           = lazy(() => import("./components/modals/MemoryModal").then(m=>({default:m.MemoryModal})));
const BookmarksModal        = lazy(() => import("./components/modals/BookmarksModal").then(m=>({default:m.BookmarksModal})));
const SearchModal           = lazy(() => import("./components/modals/SearchModal").then(m=>({default:m.SearchModal})));
const PersonaEditorModal    = lazy(() => import("./components/modals/PersonaEditorModal").then(m=>({default:m.PersonaEditorModal})));
const LocalModelModal       = lazy(() => import("./components/modals/LocalModelModal").then(m=>({default:m.LocalModelModal})));
const ProviderSettingsModal = lazy(() => import("./components/modals/ProviderSettingsModal").then(m=>({default:m.ProviderSettingsModal})));
const OsintDashboard        = lazy(() => import("./components/modals/OsintDashboard").then(m=>({default:m.OsintDashboard})));
const AdminPanel            = lazy(() => import("./components/modals/AdminPanel").then(m=>({default:m.AdminPanel})));
const ActivateModal         = lazy(() => import("./components/modals/ActivateModal").then(m=>({default:m.ActivateModal})));
const AgentModal            = lazy(() => import("./components/modals/AgentModal").then(m=>({default:m.AgentModal})));
const NexusModal            = lazy(() => import("./components/modals/NexusModal").then(m=>({default:m.NexusModal})));
const ArsenalHubModal       = lazy(() => import("./components/modals/ArsenalHubModal").then(m=>({default:m.ArsenalHubModal})));
const JarvisModal           = lazy(() => import("./components/modals/JarvisModal").then(m=>({default:m.JarvisModal})));
const ParseltongueModal     = lazy(() => import("./components/modals/ParseltongueModal").then(m=>({default:m.ParseltongueModal})));
const RagModal              = lazy(() => import("./components/modals/RagModal").then(m=>({default:m.RagModal})));
const TeamAgentModal        = lazy(() => import("./components/modals/TeamAgentModal").then(m=>({default:m.TeamAgentModal})));
const SkillsLibraryModal    = lazy(() => import("./components/modals/SkillsLibraryModal").then(m=>({default:m.SkillsLibraryModal})));
const OpenGravityModal      = lazy(() => import("./components/modals/OpenGravityModal").then(m=>({default:m.OpenGravityModal})));
const AgentOSModal          = lazy(() => import("./components/modals/AgentOSModal").then(m=>({default:m.AgentOSModal})));
const GeminiCLIModal        = lazy(() => import("./components/modals/GeminiCLIModal").then(m=>({default:m.GeminiCLIModal})));
const HermesModal           = lazy(() => import("./components/modals/HermesModal").then(m=>({default:m.HermesModal})));
const GraphifyModal         = lazy(() => import("./components/modals/GraphifyModal").then(m=>({default:m.GraphifyModal})));
const GetShitDoneModal      = lazy(() => import("./components/modals/GetShitDoneModal").then(m=>({default:m.GetShitDoneModal})));
const CCSwitchModal         = lazy(() => import("./components/modals/CCSwitchModal").then(m=>({default:m.CCSwitchModal})));
const UIUXProModal          = lazy(() => import("./components/modals/UIUXProModal").then(m=>({default:m.UIUXProModal})));
const CareerOpsModal        = lazy(() => import("./components/modals/CareerOpsModal").then(m=>({default:m.CareerOpsModal})));
const ABTopModal            = lazy(() => import("./components/modals/ABTopModal").then(m=>({default:m.ABTopModal})));
const AwesomeLLMModal       = lazy(() => import("./components/modals/AwesomeLLMModal").then(m=>({default:m.AwesomeLLMModal})));
const OsintScannerModal     = lazy(() => import("./components/modals/OsintScannerModal").then(m=>({default:m.OsintScannerModal})));
const NanoBotModal          = lazy(() => import("./components/modals/NanoBotModal").then(m=>({default:m.NanoBotModal})));
const AgentKanbanModal      = lazy(() => import("./components/modals/AgentKanbanModal").then(m=>({default:m.AgentKanbanModal})));
const AutoBEModal           = lazy(() => import("./components/modals/AutoBEModal").then(m=>({default:m.AutoBEModal})));
const SuperpowersModal      = lazy(() => import("./components/modals/SuperpowersModal").then(m=>({default:m.SuperpowersModal})));
const LerimCLIModal         = lazy(() => import("./components/modals/LerimCLIModal").then(m=>({default:m.LerimCLIModal})));
const ClaudePromptsModal    = lazy(() => import("./components/modals/ClaudePromptsModal").then(m=>({default:m.ClaudePromptsModal})));
const RunVSAgentModal       = lazy(() => import("./components/modals/RunVSAgentModal").then(m=>({default:m.RunVSAgentModal})));
const CodexMobileModal      = lazy(() => import("./components/modals/CodexMobileModal").then(m=>({default:m.CodexMobileModal})));
const OpenACPModal          = lazy(() => import("./components/modals/OpenACPModal").then(m=>({default:m.OpenACPModal})));
const HandClawModal         = lazy(() => import("./components/modals/HandClawModal").then(m=>({default:m.HandClawModal})));
const RalphAgentModal       = lazy(() => import("./components/modals/RalphAgentModal").then(m=>({default:m.RalphAgentModal})));
const BurnBabyBurnModal     = lazy(() => import("./components/modals/BurnBabyBurnModal").then(m=>({default:m.BurnBabyBurnModal})));
const CrushModal            = lazy(() => import("./components/modals/CrushModal").then(m=>({default:m.CrushModal})));
const RTKModal              = lazy(() => import("./components/modals/RTKModal").then(m=>({default:m.RTKModal})));
const CodexBarModal         = lazy(() => import("./components/modals/CodexBarModal").then(m=>({default:m.CodexBarModal})));
const CodexSaverModal       = lazy(() => import("./components/modals/CodexSaverModal").then(m=>({default:m.CodexSaverModal})));
const AgentMemoryModal      = lazy(() => import("./components/modals/AgentMemoryModal").then(m=>({default:m.AgentMemoryModal})));
const DecepticonModal       = lazy(() => import("./components/modals/DecepticonModal").then(m=>({default:m.DecepticonModal})));
const DroidDeskModal        = lazy(() => import("./components/modals/DroidDeskModal").then(m=>({default:m.DroidDeskModal})));
const BugHunterModal        = lazy(() => import("./components/modals/BugHunterModal").then(m=>({default:m.BugHunterModal})));
const HyperResearchModal    = lazy(() => import("./components/modals/HyperResearchModal").then(m=>({default:m.HyperResearchModal})));
const AIFactoryModal        = lazy(() => import("./components/modals/AIFactoryModal").then(m=>({default:m.AIFactoryModal})));
const GemmaChatModal        = lazy(() => import("./components/modals/GemmaChatModal").then(m=>({default:m.GemmaChatModal})));
const CodeGraphModal        = lazy(() => import("./components/modals/CodeGraphModal").then(m=>({default:m.CodeGraphModal})));
const OhMyPiModal           = lazy(() => import("./components/modals/OhMyPiModal").then(m=>({default:m.OhMyPiModal})));
const AwesomeOpenCodeModal  = lazy(() => import("./components/modals/AwesomeOpenCodeModal").then(m=>({default:m.AwesomeOpenCodeModal})));
const OpenRepLoveModal      = lazy(() => import("./components/modals/OpenRepLoveModal").then(m=>({default:m.OpenRepLoveModal})));
const DyadModal             = lazy(() => import("./components/modals/DyadModal").then(m=>({default:m.DyadModal})));
const GhostwriterModal      = lazy(() => import("./components/modals/GhostwriterModal").then(m=>({default:m.GhostwriterModal})));
const AgentScopeModal       = lazy(() => import("./components/modals/AgentScopeModal").then(m=>({default:m.AgentScopeModal})));
const InsForgeModal         = lazy(() => import("./components/modals/InsForgeModal").then(m=>({default:m.InsForgeModal})));
const MalwareArsenalModal   = lazy(() => import("./components/modals/MalwareArsenalModal").then(m=>({default:m.MalwareArsenalModal})));
const ThreatIntelModal      = lazy(() => import("./components/modals/ThreatIntelModal").then(m=>({default:m.ThreatIntelModal})));
const WormGPTModal          = lazy(() => import("./components/modals/WormGPTModal").then(m=>({default:m.WormGPTModal})));
const AntigravityManagerModal = lazy(() => import("./components/modals/AntigravityManagerModal").then(m=>({default:m.AntigravityManagerModal})));
const AxonHubModal          = lazy(() => import("./components/modals/AxonHubModal").then(m=>({default:m.AxonHubModal})));
const BigAGIModal           = lazy(() => import("./components/modals/BigAGIModal").then(m=>({default:m.BigAGIModal})));
const HackingToolModal      = lazy(() => import("./components/modals/HackingToolModal").then(m=>({default:m.HackingToolModal})));
const GodMod3Modal          = lazy(() => import("./components/modals/GodMod3Modal").then(m=>({default:m.GodMod3Modal})));
const GeminiResearchModal   = lazy(() => import("./components/modals/GeminiResearchModal").then(m=>({default:m.GeminiResearchModal})));
const OpenAntigravityModal  = lazy(() => import("./components/modals/OpenAntigravityModal").then(m=>({default:m.OpenAntigravityModal})));
const ChangelogModal        = lazy(() => import("./components/modals/ChangelogModal").then(m=>({default:m.ChangelogModal})));
const UseCaseLibraryModal   = lazy(() => import("./components/modals/UseCaseLibraryModal").then(m=>({default:m.UseCaseLibraryModal})));
const DeepSearchModal       = lazy(() => import("./components/modals/DeepSearchModal").then(m=>({default:m.DeepSearchModal})));
const ChainInvestigationModal = lazy(() => import("./components/modals/ChainInvestigationModal").then(m=>({default:m.ChainInvestigationModal})));
const PaseoModal            = lazy(() => import("./components/modals/PaseoModal").then(m=>({default:m.PaseoModal})));
const GemmaLibModal         = lazy(() => import("./components/modals/GemmaLibModal").then(m=>({default:m.GemmaLibModal})));
const RogueMasterModal      = lazy(() => import("./components/modals/RogueMasterModal").then(m=>({default:m.RogueMasterModal})));
const PasswordAttackModal   = lazy(() => import("./components/modals/PasswordAttackModal").then(m=>({default:m.PasswordAttackModal})));
const AIHackingSkillsModal  = lazy(() => import("./components/modals/AIHackingSkillsModal").then(m=>({default:m.AIHackingSkillsModal})));
const AITerminalModal       = lazy(() => import("./components/modals/AITerminalModal").then(m=>({default:m.AITerminalModal})));
const MarkXXXIXModal        = lazy(() => import("./components/modals/MarkXXXIXModal").then(m=>({default:m.MarkXXXIXModal})));
const MarkXXXIXORModal      = lazy(() => import("./components/modals/MarkXXXIXORModal").then(m=>({default:m.MarkXXXIXORModal})));
const FreeLLMAPIModal       = lazy(() => import("./components/modals/FreeLLMAPIModal").then(m=>({default:m.FreeLLMAPIModal})));
const NineRouterModal       = lazy(() => import("./components/modals/NineRouterModal").then(m=>({default:m.NineRouterModal})));
const FeynmanModal          = lazy(() => import("./components/modals/FeynmanModal").then(m=>({default:m.FeynmanModal})));
const GovernorModal         = lazy(() => import("./components/modals/GovernorModal").then(m=>({default:m.GovernorModal})));
const HeadroomModal         = lazy(() => import("./components/modals/HeadroomModal").then(m=>({default:m.HeadroomModal})));
const TokenOptimizerModal   = lazy(() => import("./components/modals/TokenOptimizerModal").then(m=>({default:m.TokenOptimizerModal})));
const ClaudeCodeMemoryModal = lazy(() => import("./components/modals/ClaudeCodeMemoryModal").then(m=>({default:m.ClaudeCodeMemoryModal})));
const ModelCompareModal     = lazy(() => import("./components/modals/ModelCompareModal").then(m=>({default:m.ModelCompareModal})));
const NeuralMatrixModal     = lazy(() => import("./components/modals/NeuralMatrixModal").then(m=>({default:m.NeuralMatrixModal})));
const ShellGeneratorModal   = lazy(() => import("./components/modals/ShellGeneratorModal").then(m=>({default:m.ShellGeneratorModal})));
const AnalyticsDashboard    = lazy(() => import("./components/modals/AnalyticsDashboard").then(m=>({default:m.AnalyticsDashboard})));
const MonacoEditorModal     = lazy(() => import("./components/modals/MonacoEditorModal").then(m=>({default:m.MonacoEditorModal})));
const DefensiveAIModal      = lazy(() => import("./components/modals/DefensiveAIModal").then(m=>({default:m.DefensiveAIModal})));
const OpenSkynetModal       = lazy(() => import("./components/modals/OpenSkynetModal").then(m=>({default:m.OpenSkynetModal})));
const WarRoomModal          = lazy(() => import("./components/modals/WarRoomModal").then(m=>({default:m.WarRoomModal})));
const RedTeamDashboard      = lazy(() => import("./components/modals/RedTeamDashboard").then(m=>({default:m.RedTeamDashboard})));
const ExploitChainModal     = lazy(() => import("./components/modals/ExploitChainModal").then(m=>({default:m.ExploitChainModal})));
const IntelligenceCoreModal = lazy(() => import("./components/modals/IntelligenceCoreModal").then(m=>({default:m.IntelligenceCoreModal})));
const ThreatGlobeModal      = lazy(() => import("./components/modals/ThreatGlobeModal").then(m=>({default:m.ThreatGlobeModal})));
const VulnGraph3DModal      = lazy(() => import("./components/modals/VulnGraph3DModal").then(m=>({default:m.VulnGraph3DModal})));
const LiveCodingModal       = lazy(() => import("./components/modals/LiveCodingModal").then(m=>({default:m.LiveCodingModal})));
const ExploitSandboxModal   = lazy(() => import("./components/modals/ExploitSandboxModal").then(m=>({default:m.ExploitSandboxModal})));
const GestureControlModal   = lazy(() => import("./components/modals/GestureControlModal").then(m=>({default:m.GestureControlModal})));
const NeuralVoiceModal      = lazy(() => import("./components/modals/NeuralVoiceModal").then(m=>({default:m.NeuralVoiceModal})));
const BlockchainAuditModal  = lazy(() => import("./components/modals/BlockchainAuditModal").then(m=>({default:m.BlockchainAuditModal})));
const E2ESessionModal       = lazy(() => import("./components/modals/E2ESessionModal").then(m=>({default:m.E2ESessionModal})));
const AutonomousRedTeamModal = lazy(() => import("./components/modals/AutonomousRedTeamModal").then(m=>({default:m.AutonomousRedTeamModal})));
const CyberVisionModal      = lazy(() => import("./components/modals/CyberVisionModal").then(m=>({default:m.CyberVisionModal})));
const JITExploitModal       = lazy(() => import("./components/modals/JITExploitModal").then(m=>({default:m.JITExploitModal})));
const EvasionEngineModal    = lazy(() => import("./components/modals/EvasionEngineModal").then(m=>({default:m.EvasionEngineModal})));
const VulnTopologyModal     = lazy(() => import("./components/modals/VulnTopologyModal").then(m=>({default:m.VulnTopologyModal})));
const PrecisionStrikeModal  = lazy(() => import("./components/modals/PrecisionStrikeModal").then(m=>({default:m.PrecisionStrikeModal})));
const LiveCVEModal          = lazy(() => import("./components/modals/LiveCVEModal").then(m=>({default:m.LiveCVEModal})));
const BASSimulationModal    = lazy(() => import("./components/modals/BASSimulationModal").then(m=>({default:m.BASSimulationModal})));
const NetworkTopoModal      = lazy(() => import("./components/modals/NetworkTopoModal").then(m=>({default:m.NetworkTopoModal})));
const BinaryAnalysisModal   = lazy(() => import("./components/modals/BinaryAnalysisModal").then(m=>({default:m.BinaryAnalysisModal})));
const WebFuzzingModal       = lazy(() => import("./components/modals/WebFuzzingModal").then(m=>({default:m.WebFuzzingModal})));
const MultiAgentSOCModal    = lazy(() => import("./components/modals/MultiAgentSOCModal").then(m=>({default:m.MultiAgentSOCModal})));
const OrchestrationEngineModal = lazy(() => import("./components/modals/OrchestrationEngineModal").then(m=>({default:m.OrchestrationEngineModal})));
const GlobalVulnHeatmapModal = lazy(() => import("./components/modals/GlobalVulnHeatmapModal").then(m=>({default:m.GlobalVulnHeatmapModal})));
const CyberWarfareMatrixModal = lazy(() => import("./components/modals/CyberWarfareMatrixModal").then(m=>({default:m.CyberWarfareMatrixModal})));
const SentientCyberSphereModal = lazy(() => import("./components/modals/SentientCyberSphereModal").then(m=>({default:m.SentientCyberSphereModal})));
const SecurityKanbanModal   = lazy(() => import("./components/modals/SecurityKanbanModal").then(m=>({default:m.SecurityKanbanModal})));
const NetworkMonitorModal   = lazy(() => import("./components/modals/NetworkMonitorModal").then(m=>({default:m.NetworkMonitorModal})));
const CyberCommandCenter3D  = lazy(() => import("./components/CyberCommandCenter3D").then(m=>({default:m.CyberCommandCenter3D})));
const CveTimeline3DModal    = lazy(() => import("./components/modals/CveTimeline3DModal").then(m=>({default:m.CveTimeline3DModal})));
const CyberHierarchy3DModal = lazy(() => import("./components/modals/CyberHierarchy3DModal").then(m=>({default:m.CyberHierarchy3DModal})));
const CognitiveWarfareModal = lazy(() => import("./components/modals/CognitiveWarfareModal").then(m=>({default:m.CognitiveWarfareModal})));
const AutonomousOffensiveModal = lazy(() => import("./components/modals/AutonomousOffensiveModal").then(m=>({default:m.AutonomousOffensiveModal})));
const AttackGraph3DModal = lazy(() => import("./components/modals/AttackGraph3DModal").then(m=>({default:m.AttackGraph3DModal})));

// ── MODAL STATE REDUCER ───────────────────────────────────────────────────────
const MODAL_IDS = [
  'personaEditor','localModel','providerSettings','pricing','api','settings','account',
  'tool','shortcuts','palette','toolsHub','memory','bookmarks','search','compare',
  'osintDash','admin','activate','agent','nexus','arsenal','jarvis','parseltongue',
  'rag','teamAgent','skills','openGravity','agentOS','geminiCLI','hermes','graphify',
  'getShitDone','ccswitch','uiuxpro','careerOps','abTop','awesomeLLM','osintScanner',
  'nanoBot','agentKanban','autoBE','superpowers','lerimCLI','claudePrompts','runVSAgent',
  'codexMobile','openACP','handClaw','ralph','burnbaby','crush','rtk','codexBar',
  'codexSaver','agentMemory','decepticon','droidDesk','bugHunter','hyperResearch',
  'aiFactory','gemmaChat','codeGraph','ohMyPi','awesomeOpenCode','openRepLove','dyad',
  'ghostwriter','agentScope','insForge','malwareArsenal','threatIntel','wormGPT',
  'antigravityMgr','axonHub','bigAGI','hackingTool','godMod3','geminiResearch',
  'openAntigravity','paseo','gemmaLib','rogueMaster','passwordAttack','aiHackingSkills',
  'aiTerminal','markXXXIX','markXXXIXOR','freeLLMAPI','nineRouter','feynman','governor',
  'headroom','tokenOptimizer','claudeMemory','qrSync','modelCompare','securityKanban',
  'networkMonitor','defensiveAI','openSkynet','neuralMatrix','shellGenerator','analytics',
  'monaco','warRoom','exploitChain','deepSearch','chainInvestigation','redTeamDash',
  'changelog','useCaseLib','intelligenceCore','threatGlobe','vulnGraph3D','liveCoding',
  'exploitSandbox','gestureControl','neuralVoice','blockchainAudit','e2eSession',
  'autonomousRedTeam','cyberVision','jitExploit','evasionEngine','vulnTopology',
  'precisionStrike','liveCVE','basSimulation','networkTopo','binaryAnalysis','webFuzzing',
  'multiAgentSOC','orchestrationEngine','globalVulnHeatmap','cyberWarfareMatrix',
  'sentientCyberSphere','perfDash','costDash','dedupViz','threatFeed','securityDash',
  'contextMemory','prefetch','masterHud','anomalyLog','net3D','autoSetup','cyberHub','sidebar','widgetsDock',
  'cisaLive','cveTimeline','cyberHierarchy','cognitiveWarfare','autonomousOffense','attackGraph',
] as const;

type ModalId = typeof MODAL_IDS[number];
type ModalState = Record<ModalId, boolean>;
type ModalAction =
  | { type: 'OPEN';   id: ModalId }
  | { type: 'CLOSE';  id: ModalId }
  | { type: 'TOGGLE'; id: ModalId }
  | { type: 'SET';    id: ModalId; value: boolean };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN':   return state[action.id] ? state : { ...state, [action.id]: true };
    case 'CLOSE':  return !state[action.id] ? state : { ...state, [action.id]: false };
    case 'TOGGLE': return { ...state, [action.id]: !state[action.id] };
    case 'SET':    return state[action.id] === action.value ? state : { ...state, [action.id]: action.value };
    default: return state;
  }
}

function computeInitialAutoSetup(): boolean {
  if (localStorage.getItem("mr7-ai-autoinit-done") !== "1") return true;
  const P_KEY = "mr7-ai-p-key-";
  const PROVIDERS = ["groq","openai","anthropic","gemini","openrouter","deepseek","xai","mistral","together","fireworks","perplexity","cohere","nvidia","github"];
  const hasKey = PROVIDERS.some(id => { const k = localStorage.getItem(P_KEY + id)?.trim(); return k && k.length > 10; });
  try { const s = JSON.parse(localStorage.getItem("mr7-ai-state-v2") || "{}"); if ((s?.settings?.personalApiKey?.trim()?.length ?? 0) > 10) return false; } catch { /* ignore */ }
  return !hasKey;
}

function makeInitialModals(): ModalState {
  return Object.fromEntries(MODAL_IDS.map(id => [id, id === 'autoSetup' ? computeInitialAutoSetup() : false])) as ModalState;
}

// ── ARSENAL → MODAL MAPPING ───────────────────────────────────────────────────
const ARSENAL_MAP: Partial<Record<string, ModalId>> = {
  "securitykanban": "securityKanban", "networkmonitor": "networkMonitor",
  "defensiveai": "defensiveAI",       "openskynet": "openSkynet",
  "threatglobe": "threatGlobe",       "vulngraph3d": "vulnGraph3D",
  "livecoding": "liveCoding",         "exploitsandbox": "exploitSandbox",
  "gesturecontrol": "gestureControl", "neuralvoice": "neuralVoice",
  "blockchainaudit": "blockchainAudit","e2esession": "e2eSession",
  "autonomousredteam": "autonomousRedTeam","cybervision": "cyberVision",
  "jitexploit": "jitExploit",         "evasionengine": "evasionEngine",
  "vulntopology": "vulnTopology",     "precisionstrike": "precisionStrike",
  "livecve": "liveCVE",               "bassimulation": "basSimulation",
  "networktopo": "networkTopo",       "binaryanalysis": "binaryAnalysis",
  "webfuzzing": "webFuzzing",         "multiagentsoc": "multiAgentSOC",
  "orchestrationengine": "orchestrationEngine",
  "globalvulnheatmap": "globalVulnHeatmap",
  "cyberwarfarematrix": "cyberWarfareMatrix",
  "sentientcybersphere": "sentientCyberSphere",
};

const queryClient = new QueryClient();
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

function AppContent() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const { t } = useT();
  const konamiRef = useRef<string[]>([]);
  const [godMode, setGodMode] = useState(false);
  const debounceMemRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const debouncePrefRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── SINGLE MODAL REDUCER ──────────────────────────────────────────────────
  const [modals, mDispatch] = useReducer(modalReducer, undefined, makeInitialModals);
  const open   = useCallback((id: ModalId) => mDispatch({ type: 'OPEN',   id }), []);
  const close  = useCallback((id: ModalId) => mDispatch({ type: 'CLOSE',  id }), []);
  const toggle = useCallback((id: ModalId) => mDispatch({ type: 'TOGGLE', id }), []);

  // ── NON-BOOLEAN STATE ─────────────────────────────────────────────────────
  const [arsenalPage, setArsenalPage] = useState<ArsenalModuleId | "ai-terminal" | null>(null);
  const [utility, setUtility]         = useState<UtilityTool | null>(null);
  const [monacoInitCode, setMonacoInitCode] = useState<string | undefined>();
  const [monacoInitLang, setMonacoInitLang] = useState<string | undefined>();
  const [shellGeneratorInject, setShellGeneratorInject] = useState<string | undefined>();
  const [ragPipelineDoc, setRagPipelineDoc]   = useState<{text:string;name:string;key:number}|undefined>();
  const [agentPipelineTask, setAgentPipelineTask] = useState<{text:string;key:number}|undefined>();
  const [cliPipelineContext, setCliPipelineContext] = useState<{text:string;key:number}|undefined>();
  const [idePipelineCode, setIdePipelineCode] = useState<{text:string;key:number}|undefined>();
  const [pipelineKeyRef] = useState(() => ({ n: 0 }));
  const { entries: costEntries, addEntry: addCostEntry } = useCostTracker();
  void addCostEntry; void shellGeneratorInject;

  function nextKey() { return ++pipelineKeyRef.n; }

  // ── QR sync ───────────────────────────────────────────────────────────────
  useQRSyncImport();

  // ── Subscription expiry check ─────────────────────────────────────────────
  useEffect(() => {
    function check() {
      const subRaw = localStorage.getItem("mr7-ai-state-v2"); if (!subRaw) return;
      try {
        const parsed = JSON.parse(subRaw); const sub = parsed?.subscription; if (!sub) return;
        const expired = checkAndExpireSubscription(sub);
        if (expired) { dispatch({ type: "SET_SUBSCRIPTION", patch: expired }); toast({ description: "Your subscription has expired. You have been moved to the Free plan." }); }
      } catch { /* ignore */ }
    }
    check(); const id = setInterval(check, 60_000); return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Konami code ───────────────────────────────────────────────────────────
  useEffect(() => {
    function onKonami(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT","TEXTAREA"].includes(target?.tagName) || target?.isContentEditable) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konamiRef.current = [...konamiRef.current, k].slice(-KONAMI.length);
      if (KONAMI.every((kk, i) => konamiRef.current[i] === kk)) {
        konamiRef.current = []; setGodMode(true); toast({ description: t("toast.godmodeUnlocked") });
        setTimeout(() => setGodMode(false), 4500);
      }
    }
    document.addEventListener("keydown", onKonami);
    return () => document.removeEventListener("keydown", onKonami);
  }, [toast, t]);

  // ── Silent auto-init provider ─────────────────────────────────────────────
  useEffect(() => {
    const P_KEY = "mr7-ai-p-key-"; const P_URL = "mr7-ai-p-url-";
    const PRIORITY = [
      { id: "groq",       baseURL: "https://api.groq.com/openai/v1",                          model: "llama-3.3-70b-versatile"        },
      { id: "openai",     baseURL: "https://api.openai.com/v1",                               model: "gpt-4o"                         },
      { id: "anthropic",  baseURL: "https://api.anthropic.com/v1",                            model: "claude-sonnet-4-5"              },
      { id: "gemini",     baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash"               },
      { id: "openrouter", baseURL: "https://openrouter.ai/api/v1",                            model: "deepseek/deepseek-chat-v3-0324" },
      { id: "deepseek",   baseURL: "https://api.deepseek.com/v1",                             model: "deepseek-chat"                  },
      { id: "xai",        baseURL: "https://api.x.ai/v1",                                    model: "grok-3-mini"                    },
      { id: "mistral",    baseURL: "https://api.mistral.ai/v1",                               model: "mistral-large-latest"           },
    ] as const;
    async function silentInit() {
      try {
        const res = await fetch("/api/providers");
        if (res.ok) {
          const data = await res.json() as { providers?: { id: string; available: boolean }[] };
          for (const p of PRIORITY) {
            if (data.providers?.find((sp: { id: string; available: boolean }) => sp.id === p.id && sp.available)) {
              dispatch({ type: "SET_PROVIDER", provider: p.id as never, providerModel: p.model });
              dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true, showTokenMeter: true } as never });
              mDispatch({ type: 'CLOSE', id: 'autoSetup' }); localStorage.setItem("mr7-ai-autoinit-done", "1"); return;
            }
          }
        }
      } catch { /* try localStorage */ }
      for (const p of PRIORITY) {
        const key = localStorage.getItem(P_KEY + p.id)?.trim();
        if (key && key.length > 10) {
          const url = localStorage.getItem(P_URL + p.id)?.trim() || p.baseURL;
          dispatch({ type: "SET_SETTINGS", patch: { personalApiKey: key, personalApiBaseURL: url, streaming: true, autoTitle: true, showTokenMeter: true } as never });
          dispatch({ type: "SET_PROVIDER", provider: "personal", providerModel: p.model });
          mDispatch({ type: 'CLOSE', id: 'autoSetup' }); localStorage.setItem("mr7-ai-autoinit-done", "1"); return;
        }
      }
      try {
        const s = JSON.parse(localStorage.getItem("mr7-ai-state-v2") || "{}");
        if ((s?.settings?.personalApiKey?.trim()?.length ?? 0) > 10) {
          dispatch({ type: "SET_SETTINGS", patch: { streaming: true, autoTitle: true, showTokenMeter: true } as never });
          mDispatch({ type: 'CLOSE', id: 'autoSetup' }); localStorage.setItem("mr7-ai-autoinit-done", "1");
        }
      } catch { /* ignore */ }
    }
    silentInit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced context memory + prefetch ───────────────────────────────────
  useEffect(() => {
    const chat = state.chats.find((c) => c.id === state.activeChatId);
    if (!chat) return;
    const msgs = chat.messages; if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1]; if (!last) return;
    if (debounceMemRef.current) clearTimeout(debounceMemRef.current);
    debounceMemRef.current = setTimeout(() => {
      contextMemory.addMessage(last.role as "user" | "assistant", last.content);
    }, 500);
    if (msgs.length >= 2 && last.role === "assistant") {
      const prev = msgs[msgs.length - 2];
      if (prev) {
        if (debouncePrefRef.current) clearTimeout(debouncePrefRef.current);
        debouncePrefRef.current = setTimeout(() => { prefetchEngine.analyze(prev.content, last.content); }, 1000);
      }
    }
    if (last.role === "user") prefetchEngine.recordHit(last.content);
  }, [state.chats, state.activeChatId]);

  // ── Security audit (production only) ─────────────────────────────────────
  useEffect(() => {
    if (import.meta.env.PROD) securityLayer.audit("session_start", "info", "App session active");
  }, []);

  // ── Tab visibility optimization ───────────────────────────────────────────
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) { document.body.classList.add('tab-hidden'); }
      else { document.body.classList.remove('tab-hidden'); }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inField = ["INPUT","TEXTAREA"].includes(target?.tagName) || target?.isContentEditable;
      if (!inField && e.key === "?") { e.preventDefault(); open('shortcuts'); }
      if (!inField && (e.metaKey||e.ctrlKey) && e.key === "n") { e.preventDefault(); dispatch({ type: "NEW_CHAT" }); }
      if ((e.metaKey||e.ctrlKey) && e.key === "k") { e.preventDefault(); toggle('palette'); }
      if (!inField && (e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "t") { e.preventDefault(); open('toolsHub'); }
      if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase() === "f") { e.preventDefault(); toggle('search'); }
      if (!inField && (e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") { e.preventDefault(); toggle('memory'); }
      if (!inField && (e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "b") { e.preventDefault(); toggle('bookmarks'); }
      if (!inField && (e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "c") { e.preventDefault(); toggle('compare'); }
      if (e.key === "Escape") { close('sidebar' as ModalId); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); open('admin'); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); open('monaco'); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "x") { e.preventDefault(); toggle('exploitChain'); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a" && !e.altKey) { e.preventDefault(); window.dispatchEvent(new CustomEvent("kali:trigger-auto-setup")); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); toggle('osintDash'); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); toggle('changelog'); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "u") { e.preventDefault(); toggle('useCaseLib'); }
      if ((e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") { e.preventDefault(); toggle('intelligenceCore'); }
      if (!inField && (e.metaKey||e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") { e.preventDefault(); toggle('widgetsDock'); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dispatch, open, close, toggle]);

  // ── Palette action handler ────────────────────────────────────────────────
  function handlePaletteAction(action: string, payload?: string) {
    close('palette');
    switch (action) {
      case "new-chat":       dispatch({ type: "NEW_CHAT" }); break;
      case "open-pricing":   open('pricing'); break;
      case "open-api":       open('api'); break;
      case "open-settings":  open('settings'); break;
      case "open-shortcuts": open('shortcuts'); break;
      case "set-model":      if (payload) dispatch({ type: "SET_MODEL", model: payload }); break;
      case "set-persona":    dispatch({ type: "SET_PERSONA", persona: payload || null }); break;
      case "open-tools":     open('toolsHub'); break;
      case "select-chat":    if (payload) dispatch({ type: "SELECT_CHAT", id: payload }); break;
    }
  }

  // ── Pipeline handlers ─────────────────────────────────────────────────────
  function handlePipeToRag(item: PipelineItem) { setRagPipelineDoc({ text: item.content, name: `[${item.source}] ${item.label}`, key: nextKey() }); open('rag'); }
  function handlePipeToCLI(item: PipelineItem) { setCliPipelineContext({ text: item.content, key: nextKey() }); open('geminiCLI'); }
  function handlePipeToAgent(item: PipelineItem) { setAgentPipelineTask({ text: item.content, key: nextKey() }); open('agent'); }
  function handlePipeToIDE(item: PipelineItem) { setIdePipelineCode({ text: item.content, key: nextKey() }); open('openGravity'); }

  // ── Arsenal launch handler ────────────────────────────────────────────────
  function handleArsenalLaunch(id: ArsenalModuleId) {
    close('arsenal');
    if (id === "ai-terminal") { open('aiTerminal'); return; }
    const modalId = ARSENAL_MAP[id];
    if (modalId) { open(modalId); return; }
    setArsenalPage(id);
  }

  void state;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden text-foreground selection:bg-primary/30 dark">
      <Sidebar
        isOpen={modals.sidebar}
        onClose={() => close('sidebar')}
        onOpenPricing={() => open('pricing')}
        onOpenApi={() => open('api')}
        onOpenTool={() => open('tool')}
        onOpenSettings={() => open('settings')}
        onOpenAccount={() => open('account')}
        onOpenUtility={(name) => setUtility(name)}
        onOpenToolsHub={() => open('toolsHub')}
        onOpenMemory={() => open('memory')}
        onOpenBookmarks={() => open('bookmarks')}
        onOpenSearch={() => open('search')}
        onOpenCompare={() => open('compare')}
        onOpenQRSync={() => open('qrSync')}
        onOpenChangelog={() => open('changelog')}
        onOpenOsint={() => open('osintDash')}
        onOpenUseCaseLib={() => open('useCaseLib')}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <TopBar
          onMenuClick={() => open('sidebar')}
          onOpenPricing={() => open('pricing')}
          onOpenToolsHub={() => open('toolsHub')}
          onOpenHelp={() => open('shortcuts')}
          onOpenPersonaEditor={() => open('personaEditor')}
          onOpenLocalModel={() => open('localModel')}
          onOpenAgent={() => open('agent')}
          onOpenNexus={() => open('nexus')}
          onOpenArsenal={() => open('arsenal')}
          onOpenProviderSettings={() => open('providerSettings')}
          onOpenModelCompare={() => open('modelCompare')}
          onOpenNeuralMatrix={() => open('neuralMatrix')}
          onOpenAnalytics={() => open('analytics')}
          onOpenWarRoom={() => open('warRoom')}
          onOpenDeepSearch={() => open('deepSearch')}
          onOpenChainInvestigation={() => open('chainInvestigation')}
          onOpenRedTeam={() => open('redTeamDash')}
          onOpenPerfDash={() => toggle('perfDash')}
          onOpenCostDash={() => toggle('costDash')}
          onOpenDedupViz={() => toggle('dedupViz')}
          onOpenThreatFeed={() => toggle('threatFeed')}
          onOpenSecurityDash={() => toggle('securityDash')}
          onOpenContextMemory={() => toggle('contextMemory')}
          onOpenPrefetch={() => toggle('prefetch')}
          onOpenMasterHud={() => toggle('masterHud')}
          onOpenAnomalyLog={() => toggle('anomalyLog')}
          onOpenNetworkTopo={() => toggle('net3D')}
          onOpenCyberHub={() => open('cyberHub')}
          onOpenWidgetsDock={() => open('widgetsDock')}
          onOpenCisaLive={() => toggle('cisaLive')}
          onOpenCveTimeline={() => toggle('cveTimeline')}
          onOpenCyberHierarchy={() => toggle('cyberHierarchy')}
          onOpenCognitiveWarfare={() => open('cognitiveWarfare')}
          onOpenAutonomousOffense={() => open('autonomousOffense')}
          onOpenAttackGraph={() => open('attackGraph')}
        />
        <ChatView onOpenOsintDash={() => open('osintDash')} />
        {modals.compare && <CompareView onClose={() => close('compare')} />}
      </main>

      {/* Arsenal full-page overlays */}
      <AnimatePresence>
        {arsenalPage === "ai-terminal" && (
          <div className="fixed inset-0 z-40"><AITerminal onBack={() => setArsenalPage(null)} /></div>
        )}
        {arsenalPage && arsenalPage !== "ai-terminal" && (
          <ArsenalFullPage moduleId={arsenalPage} onBack={() => setArsenalPage(null)} />
        )}
      </AnimatePresence>

      <FloatingActionDock
        onNewChat={() => dispatch({ type: "NEW_CHAT" })}
        onSearch={() => open('search')} onMemory={() => open('memory')}
        onBookmarks={() => open('bookmarks')} onCompare={() => open('compare')}
        onTools={() => open('toolsHub')} onSettings={() => open('settings')}
        onHelp={() => open('shortcuts')} onAgent={() => open('agent')}
      />

      {modals.pricing && <PricingView onClose={() => close('pricing')} />}

      {/* All lazy modals wrapped in Suspense */}
      <Suspense fallback={null}>
        <ApiAccessModal open={modals.api} onOpenChange={(v) => mDispatch({type:'SET',id:'api',value:v})} />
        <SettingsModal open={modals.settings} onOpenChange={(v) => mDispatch({type:'SET',id:'settings',value:v})} />
        <AccountModal open={modals.account} onOpenChange={(v) => mDispatch({type:'SET',id:'account',value:v})} onUpgrade={() => { close('account'); open('pricing'); }} />
        <ToolModal open={modals.tool} onOpenChange={(v) => mDispatch({type:'SET',id:'tool',value:v})} />
        <UtilityToolModal tool={utility} onOpenChange={(v) => { if (!v) setUtility(null); }} />
        <ToolsHubModal open={modals.toolsHub} onOpenChange={(v) => mDispatch({type:'SET',id:'toolsHub',value:v})} onSelect={(tool) => setUtility(tool)} />
        <ShortcutsModal open={modals.shortcuts} onOpenChange={(v) => mDispatch({type:'SET',id:'shortcuts',value:v})} />
        <CommandPalette open={modals.palette} onOpenChange={(v) => mDispatch({type:'SET',id:'palette',value:v})} onAction={handlePaletteAction} />
        <MemoryModal open={modals.memory} onOpenChange={(v) => mDispatch({type:'SET',id:'memory',value:v})} />
        <BookmarksModal open={modals.bookmarks} onOpenChange={(v) => mDispatch({type:'SET',id:'bookmarks',value:v})} />
        <SearchModal open={modals.search} onOpenChange={(v) => mDispatch({type:'SET',id:'search',value:v})} />
        <PersonaEditorModal open={modals.personaEditor} onOpenChange={(v) => mDispatch({type:'SET',id:'personaEditor',value:v})} />
        <LocalModelModal open={modals.localModel} onOpenChange={(v) => mDispatch({type:'SET',id:'localModel',value:v})} />
        <ProviderSettingsModal open={modals.providerSettings} onClose={() => close('providerSettings')} />
        <OsintDashboard open={modals.osintDash} onOpenChange={(v) => mDispatch({type:'SET',id:'osintDash',value:v})} />
        <ChangelogModal open={modals.changelog} onOpenChange={(v) => mDispatch({type:'SET',id:'changelog',value:v})} />
        <UseCaseLibraryModal open={modals.useCaseLib} onOpenChange={(v) => mDispatch({type:'SET',id:'useCaseLib',value:v})} />
        <AdminPanel open={modals.admin} onOpenChange={(v) => mDispatch({type:'SET',id:'admin',value:v})} />
        <ActivateModal open={modals.activate} onOpenChange={(v) => mDispatch({type:'SET',id:'activate',value:v})} />
        <QRSyncModal open={modals.qrSync} onClose={() => close('qrSync')} />
        <ModelCompareModal open={modals.modelCompare} onClose={() => close('modelCompare')} />
        <NeuralMatrixModal open={modals.neuralMatrix} onOpenChange={(v) => mDispatch({type:'SET',id:'neuralMatrix',value:v})} />
        <AgentModal open={modals.agent} onOpenChange={(v) => mDispatch({type:'SET',id:'agent',value:v})} pipelineTask={agentPipelineTask} />
        <NexusModal open={modals.nexus} onOpenChange={(v) => mDispatch({type:'SET',id:'nexus',value:v})} />
        <ArsenalHubModal open={modals.arsenal} onOpenChange={(v) => mDispatch({type:'SET',id:'arsenal',value:v})} onLaunch={handleArsenalLaunch} />
        <JarvisModal open={modals.jarvis} onOpenChange={(v) => mDispatch({type:'SET',id:'jarvis',value:v})} />
        <ParseltongueModal open={modals.parseltongue} onOpenChange={(v) => mDispatch({type:'SET',id:'parseltongue',value:v})} />
        <RagModal open={modals.rag} onOpenChange={(v) => mDispatch({type:'SET',id:'rag',value:v})} pipelineDoc={ragPipelineDoc} />
        <TeamAgentModal open={modals.teamAgent} onOpenChange={(v) => mDispatch({type:'SET',id:'teamAgent',value:v})} />
        <SkillsLibraryModal open={modals.skills} onOpenChange={(v) => mDispatch({type:'SET',id:'skills',value:v})} />
        <OpenGravityModal open={modals.openGravity} onOpenChange={(v) => mDispatch({type:'SET',id:'openGravity',value:v})} pipelineCode={idePipelineCode} />
        <AgentOSModal open={modals.agentOS} onOpenChange={(v) => mDispatch({type:'SET',id:'agentOS',value:v})} />
        <GeminiCLIModal open={modals.geminiCLI} onOpenChange={(v) => mDispatch({type:'SET',id:'geminiCLI',value:v})} pipelineContext={cliPipelineContext} />
        <HermesModal open={modals.hermes} onOpenChange={(v) => mDispatch({type:'SET',id:'hermes',value:v})} />
        <GraphifyModal open={modals.graphify} onOpenChange={(v) => mDispatch({type:'SET',id:'graphify',value:v})} />
        <GetShitDoneModal open={modals.getShitDone} onOpenChange={(v) => mDispatch({type:'SET',id:'getShitDone',value:v})} />
        <CCSwitchModal open={modals.ccswitch} onOpenChange={(v) => mDispatch({type:'SET',id:'ccswitch',value:v})} />
        <UIUXProModal open={modals.uiuxpro} onOpenChange={(v) => mDispatch({type:'SET',id:'uiuxpro',value:v})} />
        <CareerOpsModal open={modals.careerOps} onOpenChange={(v) => mDispatch({type:'SET',id:'careerOps',value:v})} />
        <ABTopModal open={modals.abTop} onOpenChange={(v) => mDispatch({type:'SET',id:'abTop',value:v})} />
        <AwesomeLLMModal open={modals.awesomeLLM} onOpenChange={(v) => mDispatch({type:'SET',id:'awesomeLLM',value:v})} />
        <OsintScannerModal open={modals.osintScanner} onOpenChange={(v) => mDispatch({type:'SET',id:'osintScanner',value:v})} onChainToKali={(content) => { setAgentPipelineTask({ text: content, key: nextKey() }); open('agent'); }} />
        <NanoBotModal open={modals.nanoBot} onOpenChange={(v) => mDispatch({type:'SET',id:'nanoBot',value:v})} />
        <AgentKanbanModal open={modals.agentKanban} onOpenChange={(v) => mDispatch({type:'SET',id:'agentKanban',value:v})} />
        <AutoBEModal open={modals.autoBE} onOpenChange={(v) => mDispatch({type:'SET',id:'autoBE',value:v})} />
        <SuperpowersModal open={modals.superpowers} onOpenChange={(v) => mDispatch({type:'SET',id:'superpowers',value:v})} />
        <LerimCLIModal open={modals.lerimCLI} onOpenChange={(v) => mDispatch({type:'SET',id:'lerimCLI',value:v})} />
        <ClaudePromptsModal open={modals.claudePrompts} onOpenChange={(v) => mDispatch({type:'SET',id:'claudePrompts',value:v})} />
        <RunVSAgentModal open={modals.runVSAgent} onOpenChange={(v) => mDispatch({type:'SET',id:'runVSAgent',value:v})} />
        <CodexMobileModal open={modals.codexMobile} onOpenChange={(v) => mDispatch({type:'SET',id:'codexMobile',value:v})} />
        <OpenACPModal open={modals.openACP} onOpenChange={(v) => mDispatch({type:'SET',id:'openACP',value:v})} />
        <HandClawModal open={modals.handClaw} onOpenChange={(v) => mDispatch({type:'SET',id:'handClaw',value:v})} />
        <RalphAgentModal open={modals.ralph} onOpenChange={(v) => mDispatch({type:'SET',id:'ralph',value:v})} />
        <BurnBabyBurnModal open={modals.burnbaby} onOpenChange={(v) => mDispatch({type:'SET',id:'burnbaby',value:v})} />
        <CrushModal open={modals.crush} onOpenChange={(v) => mDispatch({type:'SET',id:'crush',value:v})} />
        <RTKModal open={modals.rtk} onOpenChange={(v) => mDispatch({type:'SET',id:'rtk',value:v})} />
        <CodexBarModal open={modals.codexBar} onOpenChange={(v) => mDispatch({type:'SET',id:'codexBar',value:v})} />
        <CodexSaverModal open={modals.codexSaver} onOpenChange={(v) => mDispatch({type:'SET',id:'codexSaver',value:v})} />
        <AgentMemoryModal open={modals.agentMemory} onOpenChange={(v) => mDispatch({type:'SET',id:'agentMemory',value:v})} />
        <DecepticonModal open={modals.decepticon} onOpenChange={(v) => mDispatch({type:'SET',id:'decepticon',value:v})} />
        <DroidDeskModal open={modals.droidDesk} onOpenChange={(v) => mDispatch({type:'SET',id:'droidDesk',value:v})} />
        <BugHunterModal open={modals.bugHunter} onOpenChange={(v) => mDispatch({type:'SET',id:'bugHunter',value:v})} />
        <HyperResearchModal open={modals.hyperResearch} onOpenChange={(v) => mDispatch({type:'SET',id:'hyperResearch',value:v})} />
        <AIFactoryModal open={modals.aiFactory} onOpenChange={(v) => mDispatch({type:'SET',id:'aiFactory',value:v})} />
        <GemmaChatModal open={modals.gemmaChat} onOpenChange={(v) => mDispatch({type:'SET',id:'gemmaChat',value:v})} />
        <CodeGraphModal open={modals.codeGraph} onOpenChange={(v) => mDispatch({type:'SET',id:'codeGraph',value:v})} />
        <OhMyPiModal open={modals.ohMyPi} onOpenChange={(v) => mDispatch({type:'SET',id:'ohMyPi',value:v})} />
        <AwesomeOpenCodeModal open={modals.awesomeOpenCode} onOpenChange={(v) => mDispatch({type:'SET',id:'awesomeOpenCode',value:v})} />
        <OpenRepLoveModal open={modals.openRepLove} onOpenChange={(v) => mDispatch({type:'SET',id:'openRepLove',value:v})} />
        <DyadModal open={modals.dyad} onOpenChange={(v) => mDispatch({type:'SET',id:'dyad',value:v})} />
        <GhostwriterModal open={modals.ghostwriter} onOpenChange={(v) => mDispatch({type:'SET',id:'ghostwriter',value:v})} />
        <AgentScopeModal open={modals.agentScope} onOpenChange={(v) => mDispatch({type:'SET',id:'agentScope',value:v})} />
        <InsForgeModal open={modals.insForge} onOpenChange={(v) => mDispatch({type:'SET',id:'insForge',value:v})} />
        <MalwareArsenalModal open={modals.malwareArsenal} onOpenChange={(v) => mDispatch({type:'SET',id:'malwareArsenal',value:v})} />
        <ThreatIntelModal open={modals.threatIntel} onOpenChange={(v) => mDispatch({type:'SET',id:'threatIntel',value:v})} />
        <WormGPTModal open={modals.wormGPT} onOpenChange={(v) => mDispatch({type:'SET',id:'wormGPT',value:v})} />
        <AntigravityManagerModal open={modals.antigravityMgr} onOpenChange={(v) => mDispatch({type:'SET',id:'antigravityMgr',value:v})} />
        <AxonHubModal open={modals.axonHub} onOpenChange={(v) => mDispatch({type:'SET',id:'axonHub',value:v})} />
        <BigAGIModal open={modals.bigAGI} onOpenChange={(v) => mDispatch({type:'SET',id:'bigAGI',value:v})} />
        <HackingToolModal open={modals.hackingTool} onOpenChange={(v) => mDispatch({type:'SET',id:'hackingTool',value:v})} />
        <GodMod3Modal open={modals.godMod3} onOpenChange={(v) => mDispatch({type:'SET',id:'godMod3',value:v})} />
        <GeminiResearchModal open={modals.geminiResearch} onOpenChange={(v) => mDispatch({type:'SET',id:'geminiResearch',value:v})} />
        <OpenAntigravityModal open={modals.openAntigravity} onOpenChange={(v) => mDispatch({type:'SET',id:'openAntigravity',value:v})} />
        <PaseoModal open={modals.paseo} onOpenChange={(v) => mDispatch({type:'SET',id:'paseo',value:v})} />
        <GemmaLibModal open={modals.gemmaLib} onOpenChange={(v) => mDispatch({type:'SET',id:'gemmaLib',value:v})} />
        <RogueMasterModal open={modals.rogueMaster} onOpenChange={(v) => mDispatch({type:'SET',id:'rogueMaster',value:v})} />
        <PasswordAttackModal open={modals.passwordAttack} onOpenChange={(v) => mDispatch({type:'SET',id:'passwordAttack',value:v})} />
        <AIHackingSkillsModal open={modals.aiHackingSkills} onOpenChange={(v) => mDispatch({type:'SET',id:'aiHackingSkills',value:v})} />
        <AITerminalModal open={modals.aiTerminal} onOpenChange={(v) => mDispatch({type:'SET',id:'aiTerminal',value:v})} />
        <MarkXXXIXModal open={modals.markXXXIX} onOpenChange={(v) => mDispatch({type:'SET',id:'markXXXIX',value:v})} />
        <MarkXXXIXORModal open={modals.markXXXIXOR} onOpenChange={(v) => mDispatch({type:'SET',id:'markXXXIXOR',value:v})} />
        <FreeLLMAPIModal open={modals.freeLLMAPI} onOpenChange={(v) => mDispatch({type:'SET',id:'freeLLMAPI',value:v})} />
        <NineRouterModal open={modals.nineRouter} onOpenChange={(v) => mDispatch({type:'SET',id:'nineRouter',value:v})} />
        <FeynmanModal open={modals.feynman} onOpenChange={(v) => mDispatch({type:'SET',id:'feynman',value:v})} />
        <GovernorModal open={modals.governor} onOpenChange={(v) => mDispatch({type:'SET',id:'governor',value:v})} />
        <HeadroomModal open={modals.headroom} onOpenChange={(v) => mDispatch({type:'SET',id:'headroom',value:v})} />
        <TokenOptimizerModal open={modals.tokenOptimizer} onOpenChange={(v) => mDispatch({type:'SET',id:'tokenOptimizer',value:v})} />
        <ClaudeCodeMemoryModal open={modals.claudeMemory} onOpenChange={(v) => mDispatch({type:'SET',id:'claudeMemory',value:v})} />
        <ShellGeneratorModal open={modals.shellGenerator} onOpenChange={(v) => mDispatch({type:'SET',id:'shellGenerator',value:v})} onInjectToChat={(payload) => { setShellGeneratorInject(payload); }} />
        <AnalyticsDashboard open={modals.analytics} onClose={() => close('analytics')} />
        <SecurityKanbanModal open={modals.securityKanban} onOpenChange={(v) => mDispatch({type:'SET',id:'securityKanban',value:v})} />
        <NetworkMonitorModal open={modals.networkMonitor} onOpenChange={(v) => mDispatch({type:'SET',id:'networkMonitor',value:v})} />
        <DefensiveAIModal open={modals.defensiveAI} onOpenChange={(v) => mDispatch({type:'SET',id:'defensiveAI',value:v})} />
        <OpenSkynetModal open={modals.openSkynet} onOpenChange={(v) => mDispatch({type:'SET',id:'openSkynet',value:v})} />
        <WarRoomModal open={modals.warRoom} onOpenChange={(v) => mDispatch({type:'SET',id:'warRoom',value:v})} />
        <RedTeamDashboard open={modals.redTeamDash} onOpenChange={(v) => mDispatch({type:'SET',id:'redTeamDash',value:v})} />
        <ExploitChainModal open={modals.exploitChain} onOpenChange={(v) => mDispatch({type:'SET',id:'exploitChain',value:v})} />
        <DeepSearchModal open={modals.deepSearch} onOpenChange={(v) => mDispatch({type:'SET',id:'deepSearch',value:v})} />
        <ChainInvestigationModal open={modals.chainInvestigation} onOpenChange={(v) => mDispatch({type:'SET',id:'chainInvestigation',value:v})} />
        <MonacoEditorModal open={modals.monaco} onClose={() => close('monaco')} initialCode={monacoInitCode} initialLang={monacoInitLang}
          onSendToChat={(_code, _lang) => { dispatch({ type: "NEW_CHAT" }); toast({ description: "Code sent to chat." }); void _code; void _lang; }} />
        <IntelligenceCoreModal open={modals.intelligenceCore} onOpenChange={(v) => mDispatch({type:'SET',id:'intelligenceCore',value:v})} />
        <ThreatGlobeModal open={modals.threatGlobe} onOpenChange={(v) => mDispatch({type:'SET',id:'threatGlobe',value:v})} />
        <VulnGraph3DModal open={modals.vulnGraph3D} onOpenChange={(v) => mDispatch({type:'SET',id:'vulnGraph3D',value:v})} />
        <LiveCodingModal open={modals.liveCoding} onOpenChange={(v) => mDispatch({type:'SET',id:'liveCoding',value:v})} />
        <ExploitSandboxModal open={modals.exploitSandbox} onOpenChange={(v) => mDispatch({type:'SET',id:'exploitSandbox',value:v})} />
        <GestureControlModal open={modals.gestureControl} onOpenChange={(v) => mDispatch({type:'SET',id:'gestureControl',value:v})} />
        <NeuralVoiceModal open={modals.neuralVoice} onOpenChange={(v) => mDispatch({type:'SET',id:'neuralVoice',value:v})} />
        <BlockchainAuditModal open={modals.blockchainAudit} onOpenChange={(v) => mDispatch({type:'SET',id:'blockchainAudit',value:v})} />
        <E2ESessionModal open={modals.e2eSession} onOpenChange={(v) => mDispatch({type:'SET',id:'e2eSession',value:v})} />
        <AutonomousRedTeamModal open={modals.autonomousRedTeam} onOpenChange={(v) => mDispatch({type:'SET',id:'autonomousRedTeam',value:v})} />
        <CyberVisionModal open={modals.cyberVision} onOpenChange={(v) => mDispatch({type:'SET',id:'cyberVision',value:v})} />
        <JITExploitModal open={modals.jitExploit} onOpenChange={(v) => mDispatch({type:'SET',id:'jitExploit',value:v})} />
        <EvasionEngineModal open={modals.evasionEngine} onOpenChange={(v) => mDispatch({type:'SET',id:'evasionEngine',value:v})} />
        <VulnTopologyModal open={modals.vulnTopology} onOpenChange={(v) => mDispatch({type:'SET',id:'vulnTopology',value:v})} />
        <PrecisionStrikeModal open={modals.precisionStrike} onOpenChange={(v) => mDispatch({type:'SET',id:'precisionStrike',value:v})} />
        <LiveCVEModal open={modals.liveCVE} onOpenChange={(v) => mDispatch({type:'SET',id:'liveCVE',value:v})} />
        <BASSimulationModal open={modals.basSimulation} onOpenChange={(v) => mDispatch({type:'SET',id:'basSimulation',value:v})} />
        <NetworkTopoModal open={modals.networkTopo} onOpenChange={(v) => mDispatch({type:'SET',id:'networkTopo',value:v})} />
        <BinaryAnalysisModal open={modals.binaryAnalysis} onOpenChange={(v) => mDispatch({type:'SET',id:'binaryAnalysis',value:v})} />
        <WebFuzzingModal open={modals.webFuzzing} onOpenChange={(v) => mDispatch({type:'SET',id:'webFuzzing',value:v})} />
        <MultiAgentSOCModal open={modals.multiAgentSOC} onOpenChange={(v) => mDispatch({type:'SET',id:'multiAgentSOC',value:v})} />
        <OrchestrationEngineModal open={modals.orchestrationEngine} onOpenChange={(v) => mDispatch({type:'SET',id:'orchestrationEngine',value:v})} />
        <GlobalVulnHeatmapModal open={modals.globalVulnHeatmap} onOpenChange={(v) => mDispatch({type:'SET',id:'globalVulnHeatmap',value:v})} />
        <CyberWarfareMatrixModal open={modals.cyberWarfareMatrix} onOpenChange={(v) => mDispatch({type:'SET',id:'cyberWarfareMatrix',value:v})} />
        <SentientCyberSphereModal open={modals.sentientCyberSphere} onOpenChange={(v) => mDispatch({type:'SET',id:'sentientCyberSphere',value:v})} />

        {/* Cyber Command Center 3D — full screen */}
        {modals.cyberHub && (
          <CyberCommandCenter3D
            open={modals.cyberHub}
            onClose={() => close('cyberHub')}
            onOpenModal={(id) => { close('cyberHub'); open(id as ModalId); }}
          />
        )}
      </Suspense>

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

      {/* Always-on ambient layers — conditionally paused when tab hidden */}
      <CyberHeatmapHUD />
      <SystemStatusWidget />
      <div className="hidden md:block"><AmbientParticleField density={0.3} /></div>
      <div className="hidden md:block"><HoloDataStream side="both" /></div>
      {/* CyberWidgetsDock removed — accessible via TopBar "HUD" button */}
      <AnimatePresence>
        {modals.widgetsDock && <CyberHUDOverlay key="widgets-dock" onClose={() => close('widgetsDock')} />}
      </AnimatePresence>

      <div className="hidden md:block">
        <PipelineHUD
          onSendToRag={handlePipeToRag} onSendToCLI={handlePipeToCLI}
          onSendToAgent={handlePipeToAgent} onSendToIDE={handlePipeToIDE}
        />
      </div>

      {/* AI Auto-Setup 3D */}
      <AnimatePresence>
        {modals.autoSetup && (
          <AIAutoSetup3D key="auto-setup" onComplete={() => { localStorage.setItem("mr7-ai-autoinit-done", "1"); close('autoSetup'); }} />
        )}
      </AnimatePresence>

      {/* Conditional 3D overlays — only mount when open */}
      {modals.perfDash    && <PerformanceDashboard3D onClose={() => close('perfDash')} />}
      {modals.costDash    && <CostDashboard3D entries={costEntries} onClose={() => close('costDash')} />}
      {modals.dedupViz    && <DedupVisualizer3D onClose={() => close('dedupViz')} />}
      {modals.threatFeed  && <ThreatFeed3D onClose={() => close('threatFeed')} />}
      {modals.securityDash && <SecurityDashboard3D onClose={() => close('securityDash')} />}
      {modals.contextMemory && <ContextMemoryPanel3D onClose={() => close('contextMemory')} />}
      {modals.prefetch    && <PrefetchIntelligence3D onClose={() => close('prefetch')} />}
      {modals.masterHud   && <SystemMasterHUD3D
        onOpenPerf={() => open('perfDash')}       onOpenCost={() => open('costDash')}
        onOpenDedup={() => open('dedupViz')}      onOpenThreat={() => open('threatFeed')}
        onOpenSecurity={() => open('securityDash')} onOpenMemory={() => open('contextMemory')}
        onOpenPrefetch={() => open('prefetch')}   onOpenAnomalyLog={() => open('anomalyLog')}
      />}
      {modals.anomalyLog  && <AnomalyLog3D onClose={() => close('anomalyLog')} />}
      {modals.net3D       && <NetworkTopology3D onClose={() => close('net3D')} />}

      {/* CISA KEV Live Panel — WebSocket powered */}
      <CisaLivePanel3D open={modals.cisaLive} onClose={() => close('cisaLive')} />

      {/* CISA KEV Global Alert Toaster — always-on 3D popup notifications */}
      <CisaKevAlertToaster />

      {/* CVE Timeline 3D */}
      <CveTimeline3DModal open={modals.cveTimeline} onOpenChange={(v) => mDispatch({type:'SET',id:'cveTimeline',value:v})} />

      {/* Cyber Hierarchy 3D — هرم الخطر السيبراني */}
      <CyberHierarchy3DModal open={modals.cyberHierarchy} onOpenChange={(v) => mDispatch({type:'SET',id:'cyberHierarchy',value:v})} />

      {/* Cognitive Cyber Warfare */}
      <CognitiveWarfareModal open={modals.cognitiveWarfare} onOpenChange={(v) => mDispatch({type:'SET',id:'cognitiveWarfare',value:v})} />

      {/* Autonomous Offensive Framework */}
      <AutonomousOffensiveModal open={modals.autonomousOffense} onOpenChange={(v) => mDispatch({type:'SET',id:'autonomousOffense',value:v})} />

      {/* Attack Graph 3D Visualizer */}
      <AttackGraph3DModal open={modals.attackGraph} onOpenChange={(v) => mDispatch({type:'SET',id:'attackGraph',value:v})} />
    </div>
  );
}

export default function App() {
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
