import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import type { ArsenalModuleId } from "./modals/ArsenalHubModal";
import { ARSENAL_MODULES } from "./modals/ArsenalHubModal";

// Import all Arsenal modals to render them as full pages
import { AgentModal } from "./modals/AgentModal";
import { NexusModal } from "./modals/NexusModal";
import { JarvisModal } from "./modals/JarvisModal";
import { ParseltongueModal } from "./modals/ParseltongueModal";
import { RagModal } from "./modals/RagModal";
import { TeamAgentModal } from "./modals/TeamAgentModal";
import { SkillsLibraryModal } from "./modals/SkillsLibraryModal";
import { OpenGravityModal } from "./modals/OpenGravityModal";
import { AgentOSModal } from "./modals/AgentOSModal";
import { GeminiCLIModal } from "./modals/GeminiCLIModal";
import { HermesModal } from "./modals/HermesModal";
import { GraphifyModal } from "./modals/GraphifyModal";
import { GetShitDoneModal } from "./modals/GetShitDoneModal";
import { CCSwitchModal } from "./modals/CCSwitchModal";
import { UIUXProModal } from "./modals/UIUXProModal";
import { CareerOpsModal } from "./modals/CareerOpsModal";
import { ABTopModal } from "./modals/ABTopModal";
import { AwesomeLLMModal } from "./modals/AwesomeLLMModal";
import { OsintScannerModal } from "./modals/OsintScannerModal";
import { NanoBotModal } from "./modals/NanoBotModal";
import { AgentKanbanModal } from "./modals/AgentKanbanModal";
import { AutoBEModal } from "./modals/AutoBEModal";
import { SuperpowersModal } from "./modals/SuperpowersModal";
import { LerimCLIModal } from "./modals/LerimCLIModal";
import { ClaudePromptsModal } from "./modals/ClaudePromptsModal";
import { RunVSAgentModal } from "./modals/RunVSAgentModal";
import { CodexMobileModal } from "./modals/CodexMobileModal";
import { OpenACPModal } from "./modals/OpenACPModal";
import { HandClawModal } from "./modals/HandClawModal";
import { RalphAgentModal } from "./modals/RalphAgentModal";
import { BurnBabyBurnModal } from "./modals/BurnBabyBurnModal";
import { CrushModal } from "./modals/CrushModal";
import { RTKModal } from "./modals/RTKModal";
import { CodexBarModal } from "./modals/CodexBarModal";
import { CodexSaverModal } from "./modals/CodexSaverModal";
import { AgentMemoryModal } from "./modals/AgentMemoryModal";
import { DecepticonModal } from "./modals/DecepticonModal";
import { DroidDeskModal } from "./modals/DroidDeskModal";
import { BugHunterModal } from "./modals/BugHunterModal";
import { HyperResearchModal } from "./modals/HyperResearchModal";
import { AIFactoryModal } from "./modals/AIFactoryModal";
import { GemmaChatModal } from "./modals/GemmaChatModal";
import { CodeGraphModal } from "./modals/CodeGraphModal";
import { OhMyPiModal } from "./modals/OhMyPiModal";
import { AwesomeOpenCodeModal } from "./modals/AwesomeOpenCodeModal";
import { OpenRepLoveModal } from "./modals/OpenRepLoveModal";
import { DyadModal } from "./modals/DyadModal";
import { GhostwriterModal } from "./modals/GhostwriterModal";
import { AgentScopeModal } from "./modals/AgentScopeModal";
import { InsForgeModal } from "./modals/InsForgeModal";
import { MalwareArsenalModal } from "./modals/MalwareArsenalModal";
import { ThreatIntelModal } from "./modals/ThreatIntelModal";
import { WormGPTModal } from "./modals/WormGPTModal";
import { AntigravityManagerModal } from "./modals/AntigravityManagerModal";
import { AxonHubModal } from "./modals/AxonHubModal";
import { BigAGIModal } from "./modals/BigAGIModal";
import { HackingToolModal } from "./modals/HackingToolModal";
import { GodMod3Modal } from "./modals/GodMod3Modal";
import { GeminiResearchModal } from "./modals/GeminiResearchModal";
import { OpenAntigravityModal } from "./modals/OpenAntigravityModal";
import { PaseoModal } from "./modals/PaseoModal";
import { GemmaLibModal } from "./modals/GemmaLibModal";
import { RogueMasterModal } from "./modals/RogueMasterModal";
import { PasswordAttackModal } from "./modals/PasswordAttackModal";
import { AIHackingSkillsModal } from "./modals/AIHackingSkillsModal";
import { ClaudeCodeModal } from "./modals/ClaudeCodeModal";
// Batch 6 — new ZIPs
import { AdaV2Modal } from "./modals/AdaV2Modal";
import { OmniBotModal } from "./modals/OmniBotModal";
import { PocketAIModal } from "./modals/PocketAIModal";
import { ClaudeSkillsModal } from "./modals/ClaudeSkillsModal";
import { BuildYourOwnXModal } from "./modals/BuildYourOwnXModal";
import { InstagramCLIModal } from "./modals/InstagramCLIModal";
// Batch 7 — Mark XXXIX, FreeLLMAPI, 9Router, Feynman, Governor, Headroom, TokenOptimizer, ClaudeMemory
import { MarkXXXIXModal } from "./modals/MarkXXXIXModal";
import { MarkXXXIXORModal } from "./modals/MarkXXXIXORModal";
import { FreeLLMAPIModal } from "./modals/FreeLLMAPIModal";
import { NineRouterModal } from "./modals/NineRouterModal";
import { FeynmanModal } from "./modals/FeynmanModal";
import { GovernorModal } from "./modals/GovernorModal";
import { HeadroomModal } from "./modals/HeadroomModal";
import { TokenOptimizerModal } from "./modals/TokenOptimizerModal";
import { ClaudeCodeMemoryModal } from "./modals/ClaudeCodeMemoryModal";
// Batch 8 — Cyber Intelligence Suite
import { CyberIntelBrainModal } from "./modals/CyberIntelBrainModal";
import { AgentSwarmModal } from "./modals/AgentSwarmModal";
import { ArchEngineModal } from "./modals/ArchEngineModal";
import { SysCognitionModal } from "./modals/SysCognitionModal";
import { AnomalyCSModal } from "./modals/AnomalyCSModal";
import { BinaryCoreModal } from "./modals/BinaryCoreModal";
import { SysObsModal } from "./modals/SysObsModal";
import { CyberWarfareModal } from "./modals/CyberWarfareModal";
import { ThreatCogModal } from "./modals/ThreatCogModal";
import { MalwareCogModal } from "./modals/MalwareCogModal";
import { ExploitAbsModal } from "./modals/ExploitAbsModal";
import { VulnDiscoveryModal } from "./modals/VulnDiscoveryModal";
import { InfraIntelModal } from "./modals/InfraIntelModal";
import { SelfHealingModal } from "./modals/SelfHealingModal";
import { AttackSurfaceModal } from "./modals/AttackSurfaceModal";
import { DeepPacketModal } from "./modals/DeepPacketModal";
import { IdentityGraphModal } from "./modals/IdentityGraphModal";
import { AutonomousSOCModal } from "./modals/AutonomousSOCModal";
import { DataIntelModal } from "./modals/DataIntelModal";
import { SysEvolutionModal } from "./modals/SysEvolutionModal";
import { DigitalTwinModal } from "./modals/DigitalTwinModal";
import { SovereignAIModal } from "./modals/SovereignAIModal";
import { ThreatPredictModal } from "./modals/ThreatPredictModal";
import { ForensicReconModal } from "./modals/ForensicReconModal";
import { ExploitResistModal } from "./modals/ExploitResistModal";
import { CyberPhysicalModal } from "./modals/CyberPhysicalModal";
import { ProviderStatusModal } from "./modals/ProviderStatusModal";

interface Props {
  moduleId: ArsenalModuleId;
  onBack: () => void;
}

// Wrapper that converts any modal (overlay style) to a full-page view
// by passing open=true and replacing onOpenChange(false) with onBack
function FullPageWrapper({ children, moduleId, onBack }: { children: React.ReactNode; moduleId: ArsenalModuleId; onBack: () => void }) {
  const mod = ARSENAL_MODULES.find(m => m.id === moduleId);
  return (
    <motion.div
      key={moduleId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-40 flex flex-col"
      style={{ background: "#060606" }}
    >
      {/* Full-page top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: `${mod?.color ?? "#e21227"}20`, background: `${mod?.color ?? "#e21227"}06` }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:bg-white/5"
          style={{ color: mod?.color ?? "#e21227", border: `1px solid ${mod?.color ?? "#e21227"}35` }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          ARSENAL HUB
        </button>

        {mod && (
          <div className="flex items-center gap-2 ml-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}30` }}
            >
              <mod.icon className="w-3.5 h-3.5" style={{ color: mod.color }} />
            </div>
            <div>
              <div className="text-[12px] font-bold" style={{ color: mod.color }}>{mod.name}</div>
              <div className="text-[9px] font-mono" style={{ color: "#444" }}>{mod.subtitle}</div>
            </div>
            <span
              className="ml-2 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${mod.color}12`, color: mod.color }}
            >
              {mod.tag}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: mod?.color ?? "#e21227" }} />
          <span className="text-[9px] font-mono" style={{ color: mod?.color ?? "#e21227" }}>LIVE</span>
        </div>

        <button
          onClick={onBack}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5 ml-2"
        >
          <X className="w-4 h-4" style={{ color: "#444" }} />
        </button>
      </div>

      {/* Modal content rendered full-screen */}
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </motion.div>
  );
}

// Renders the correct modal as a full-page view
export function ArsenalFullPage({ moduleId, onBack }: Props) {
  const close = () => {}; // noop — we handle close via onBack
  const open = true;

  const modal = (() => {
    switch (moduleId) {
      case "kaliagent":       return <AgentModal open={open} onOpenChange={v => !v && onBack()} />;
      case "nexus":           return <NexusModal open={open} onOpenChange={v => !v && onBack()} />;
      case "jarvis":          return <JarvisModal open={open} onOpenChange={v => !v && onBack()} />;
      case "parseltongue":    return <ParseltongueModal open={open} onOpenChange={v => !v && onBack()} />;
      case "ragflow":         return <RagModal open={open} onOpenChange={v => !v && onBack()} />;
      case "teamagent":       return <TeamAgentModal open={open} onOpenChange={v => !v && onBack()} />;
      case "skills":          return <SkillsLibraryModal open={open} onOpenChange={v => !v && onBack()} />;
      case "opengravity":     return <OpenGravityModal open={open} onOpenChange={v => !v && onBack()} />;
      case "agentOS":         return <AgentOSModal open={open} onOpenChange={v => !v && onBack()} />;
      case "geminiCLI":       return <GeminiCLIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "hermes":          return <HermesModal open={open} onOpenChange={v => !v && onBack()} />;
      case "graphify":        return <GraphifyModal open={open} onOpenChange={v => !v && onBack()} />;
      case "getshitdone":     return <GetShitDoneModal open={open} onOpenChange={v => !v && onBack()} />;
      case "ccswitch":        return <CCSwitchModal open={open} onOpenChange={v => !v && onBack()} />;
      case "uiuxpro":         return <UIUXProModal open={open} onOpenChange={v => !v && onBack()} />;
      case "careerops":       return <CareerOpsModal open={open} onOpenChange={v => !v && onBack()} />;
      case "abtop":           return <ABTopModal open={open} onOpenChange={v => !v && onBack()} />;
      case "awesomellm":      return <AwesomeLLMModal open={open} onOpenChange={v => !v && onBack()} />;
      case "osintscanner":    return <OsintScannerModal open={open} onOpenChange={v => !v && onBack()} />;
      case "nanobot":         return <NanoBotModal open={open} onOpenChange={v => !v && onBack()} />;
      case "agentkanban":     return <AgentKanbanModal open={open} onOpenChange={v => !v && onBack()} />;
      case "autobe":          return <AutoBEModal open={open} onOpenChange={v => !v && onBack()} />;
      case "superpowers":     return <SuperpowersModal open={open} onOpenChange={v => !v && onBack()} />;
      case "lerimcli":        return <LerimCLIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "claudeprompts":   return <ClaudePromptsModal open={open} onOpenChange={v => !v && onBack()} />;
      case "rvsagent":        return <RunVSAgentModal open={open} onOpenChange={v => !v && onBack()} />;
      case "codexmobile":     return <CodexMobileModal open={open} onOpenChange={v => !v && onBack()} />;
      case "openacp":         return <OpenACPModal open={open} onOpenChange={v => !v && onBack()} />;
      case "handclaw":        return <HandClawModal open={open} onOpenChange={v => !v && onBack()} />;
      case "ralph":           return <RalphAgentModal open={open} onOpenChange={v => !v && onBack()} />;
      case "burnbaby":        return <BurnBabyBurnModal open={open} onOpenChange={v => !v && onBack()} />;
      case "crush":           return <CrushModal open={open} onOpenChange={v => !v && onBack()} />;
      case "rtk":             return <RTKModal open={open} onOpenChange={v => !v && onBack()} />;
      case "codexbar":        return <CodexBarModal open={open} onOpenChange={v => !v && onBack()} />;
      case "codexsaver":      return <CodexSaverModal open={open} onOpenChange={v => !v && onBack()} />;
      case "agentmemory":     return <AgentMemoryModal open={open} onOpenChange={v => !v && onBack()} />;
      case "decepticon":      return <DecepticonModal open={open} onOpenChange={v => !v && onBack()} />;
      case "droiddesk":       return <DroidDeskModal open={open} onOpenChange={v => !v && onBack()} />;
      case "bughunter":       return <BugHunterModal open={open} onOpenChange={v => !v && onBack()} />;
      case "hyperresearch":   return <HyperResearchModal open={open} onOpenChange={v => !v && onBack()} />;
      case "aifactory":       return <AIFactoryModal open={open} onOpenChange={v => !v && onBack()} />;
      case "gemmachat":       return <GemmaChatModal open={open} onOpenChange={v => !v && onBack()} />;
      case "codegraph":       return <CodeGraphModal open={open} onOpenChange={v => !v && onBack()} />;
      case "ohmypi":          return <OhMyPiModal open={open} onOpenChange={v => !v && onBack()} />;
      case "awesomeopencode": return <AwesomeOpenCodeModal open={open} onOpenChange={v => !v && onBack()} />;
      case "openreplove":     return <OpenRepLoveModal open={open} onOpenChange={v => !v && onBack()} />;
      case "dyad":            return <DyadModal open={open} onOpenChange={v => !v && onBack()} />;
      case "ghostwriter":     return <GhostwriterModal open={open} onOpenChange={v => !v && onBack()} />;
      case "agentscope":      return <AgentScopeModal open={open} onOpenChange={v => !v && onBack()} />;
      case "insforge":        return <InsForgeModal open={open} onOpenChange={v => !v && onBack()} />;
      case "malwarearsenal":  return <MalwareArsenalModal open={open} onOpenChange={v => !v && onBack()} />;
      case "threatintel":     return <ThreatIntelModal open={open} onOpenChange={v => !v && onBack()} />;
      case "wormgpt":         return <WormGPTModal open={open} onOpenChange={v => !v && onBack()} />;
      case "antigravitymgr":  return <AntigravityManagerModal open={open} onOpenChange={v => !v && onBack()} />;
      case "axonhub":         return <AxonHubModal open={open} onOpenChange={v => !v && onBack()} />;
      case "bigagi":          return <BigAGIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "hackingtool":     return <HackingToolModal open={open} onOpenChange={v => !v && onBack()} />;
      case "godmod3":         return <GodMod3Modal open={open} onOpenChange={v => !v && onBack()} />;
      case "geminiresearch":  return <GeminiResearchModal open={open} onOpenChange={v => !v && onBack()} />;
      case "openantigravity": return <OpenAntigravityModal open={open} onOpenChange={v => !v && onBack()} />;
      case "paseo":           return <PaseoModal open={open} onOpenChange={v => !v && onBack()} />;
      case "gemmalib":        return <GemmaLibModal open={open} onOpenChange={v => !v && onBack()} />;
      case "roguemaster":     return <RogueMasterModal open={open} onOpenChange={v => !v && onBack()} />;
      case "passwordattack":  return <PasswordAttackModal open={open} onOpenChange={v => !v && onBack()} />;
      case "aihackingskills": return <AIHackingSkillsModal open={open} onOpenChange={v => !v && onBack()} />;
      case "claudecode":      return <ClaudeCodeModal open={open} onOpenChange={v => !v && onBack()} />;
      // Batch 6
      case "adav2":           return <AdaV2Modal open={open} onOpenChange={v => !v && onBack()} />;
      case "omnibot":         return <OmniBotModal open={open} onOpenChange={v => !v && onBack()} />;
      case "pocketai":        return <PocketAIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "claudeskills":    return <ClaudeSkillsModal open={open} onOpenChange={v => !v && onBack()} />;
      case "buildyourownx":   return <BuildYourOwnXModal open={open} onOpenChange={v => !v && onBack()} />;
      case "instagramcli":    return <InstagramCLIModal open={open} onOpenChange={v => !v && onBack()} />;
      // Batch 7
      case "markxxxix":       return <MarkXXXIXModal open={open} onOpenChange={v => !v && onBack()} />;
      case "markxxxixor":     return <MarkXXXIXORModal open={open} onOpenChange={v => !v && onBack()} />;
      case "freellmapi":      return <FreeLLMAPIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "ninerouter":      return <NineRouterModal open={open} onOpenChange={v => !v && onBack()} />;
      case "feynman":         return <FeynmanModal open={open} onOpenChange={v => !v && onBack()} />;
      case "governor":        return <GovernorModal open={open} onOpenChange={v => !v && onBack()} />;
      case "headroom":        return <HeadroomModal open={open} onOpenChange={v => !v && onBack()} />;
      case "tokenoptimizer":  return <TokenOptimizerModal open={open} onOpenChange={v => !v && onBack()} />;
      case "claudememory":    return <ClaudeCodeMemoryModal open={open} onOpenChange={v => !v && onBack()} />;
      // Batch 8 — Cyber Intelligence Suite
      case "cyberintel":      return <CyberIntelBrainModal open={open} onOpenChange={v => !v && onBack()} />;
      case "agentswarm":      return <AgentSwarmModal open={open} onOpenChange={v => !v && onBack()} />;
      case "archengine":      return <ArchEngineModal open={open} onOpenChange={v => !v && onBack()} />;
      case "syscognition":    return <SysCognitionModal open={open} onOpenChange={v => !v && onBack()} />;
      case "anomalycs":       return <AnomalyCSModal open={open} onOpenChange={v => !v && onBack()} />;
      case "binarycore":      return <BinaryCoreModal open={open} onOpenChange={v => !v && onBack()} />;
      case "sysobs":          return <SysObsModal open={open} onOpenChange={v => !v && onBack()} />;
      case "cyberwarfare":    return <CyberWarfareModal open={open} onOpenChange={v => !v && onBack()} />;
      case "threatcog":       return <ThreatCogModal open={open} onOpenChange={v => !v && onBack()} />;
      case "malwarecog":      return <MalwareCogModal open={open} onOpenChange={v => !v && onBack()} />;
      case "exploitabs":      return <ExploitAbsModal open={open} onOpenChange={v => !v && onBack()} />;
      case "vulndiscovery":   return <VulnDiscoveryModal open={open} onOpenChange={v => !v && onBack()} />;
      case "infraintel":      return <InfraIntelModal open={open} onOpenChange={v => !v && onBack()} />;
      case "selfhealing":     return <SelfHealingModal open={open} onOpenChange={v => !v && onBack()} />;
      case "attacksurface":   return <AttackSurfaceModal open={open} onOpenChange={v => !v && onBack()} />;
      case "deeppacket":      return <DeepPacketModal open={open} onOpenChange={v => !v && onBack()} />;
      case "identitygraph":   return <IdentityGraphModal open={open} onOpenChange={v => !v && onBack()} />;
      case "autonomoussoc":   return <AutonomousSOCModal open={open} onOpenChange={v => !v && onBack()} />;
      case "dataintel":       return <DataIntelModal open={open} onOpenChange={v => !v && onBack()} />;
      case "sysevolution":    return <SysEvolutionModal open={open} onOpenChange={v => !v && onBack()} />;
      case "digitaltwin":     return <DigitalTwinModal open={open} onOpenChange={v => !v && onBack()} />;
      case "sovereignai":     return <SovereignAIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "threatpredict":   return <ThreatPredictModal open={open} onOpenChange={v => !v && onBack()} />;
      case "forensicrecon":   return <ForensicReconModal open={open} onOpenChange={v => !v && onBack()} />;
      case "exploitresist":   return <ExploitResistModal open={open} onOpenChange={v => !v && onBack()} />;
      case "cyberphysical":   return <CyberPhysicalModal open={open} onOpenChange={v => !v && onBack()} />;
      case "providerstatus":  return <ProviderStatusModal open={open} onOpenChange={v => !v && onBack()} />;
      default:                return null;
    }
  })();

  return (
    <AnimatePresence>
      <FullPageWrapper moduleId={moduleId} onBack={onBack}>
        {/* Override the modal's own overlay/backdrop by rendering in a positioned container */}
        <div className="absolute inset-0 overflow-hidden" style={{ background: "#060606" }}>
          {/* Inject CSS to override modal fixed positioning inside this container */}
          <style>{`
            .arsenal-fullpage-host .fixed {
              position: absolute !important;
            }
            .arsenal-fullpage-host [style*="background: rgba(0,0,0"] {
              background: transparent !important;
              backdrop-filter: none !important;
            }
            .arsenal-fullpage-host [style*="backdropFilter"] {
              backdrop-filter: none !important;
            }
          `}</style>
          <div className="arsenal-fullpage-host w-full h-full overflow-auto relative">
            {modal}
          </div>
        </div>
      </FullPageWrapper>
    </AnimatePresence>
  );
}

// Also export ArsenalModuleId for re-use
export type { ArsenalModuleId };
