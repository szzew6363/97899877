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
// Batch 9 — Security Tooling + AI Safety + Advanced Intelligence
import { SecurityKanbanModal } from "./modals/SecurityKanbanModal";
import { NetworkMonitorModal } from "./modals/NetworkMonitorModal";
import { OpenSkynetModal } from "./modals/OpenSkynetModal";
import { DefensiveAIModal } from "./modals/DefensiveAIModal";
import { ThreatDetectionModal } from "./modals/ThreatDetectionModal";
import { DeepfakeDetectorModal } from "./modals/DeepfakeDetectorModal";
import { MisinfoDetectorModal } from "./modals/MisinfoDetectorModal";
import { CyberConsciousnessModal } from "./modals/CyberConsciousnessModal";
import { BehavioralDNAModal } from "./modals/BehavioralDNAModal";
import { IncidentResponseModal } from "./modals/IncidentResponseModal";
import { IntelligenceFabricModal } from "./modals/IntelligenceFabricModal";
import { TemporalThreatModal } from "./modals/TemporalThreatModal";
import { CyberEvolutionModal } from "./modals/CyberEvolutionModal";
import { MalwareAnalysisModal } from "./modals/MalwareAnalysisModal";
import { AISafetyModal } from "./modals/AISafetyModal";
import { MultiRealityModal } from "./modals/MultiRealityModal";
import { ZeroBoundaryModal } from "./modals/ZeroBoundaryModal";
import { GlobalIntelSyncModal } from "./modals/GlobalIntelSyncModal";
import { PrivacyRiskModal } from "./modals/PrivacyRiskModal";
import { CrossDomainRiskModal } from "./modals/CrossDomainRiskModal";
import { SelfImprovingModal } from "./modals/SelfImprovingModal";
import { HyperAdaptiveModal } from "./modals/HyperAdaptiveModal";
import { CausalReasoningModal } from "./modals/CausalReasoningModal";
import { FullSpectrumAIModal } from "./modals/FullSpectrumAIModal";
import { AutonomousOversightModal } from "./modals/AutonomousOversightModal";
import { LargeScaleAnomalyModal } from "./modals/LargeScaleAnomalyModal";
// ARTP Suite — Enterprise Red Team Platform, PentestLab Pro, SOC Command Center
import { ARTPlatformModal } from "./modals/ARTPlatformModal";
import { PentestLabProModal } from "./modals/PentestLabProModal";
import { SOCCommandModal } from "./modals/SOCCommandModal";
// Autonomous Decision Engine — Neural AI, Adaptive Learning, Self-Optimizing
import { AutonomousDecisionEngineModal } from "./modals/AutonomousDecisionEngineModal";

interface Props {
  moduleId: ArsenalModuleId;
  onBack: () => void;
}

const FULLPAGE_CSS = `
  @keyframes fp-scan {
    0% { top: -2px; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes fp-title-glow {
    0%, 100% { text-shadow: 0 0 12px var(--mod-color, #e21227), 0 0 24px rgba(226,18,39,0.3); }
    50% { text-shadow: 0 0 24px var(--mod-color, #e21227), 0 0 48px rgba(226,18,39,0.5); }
  }
  @keyframes fp-icon-pulse {
    0%, 100% { box-shadow: 0 0 12px var(--mod-glow, rgba(226,18,39,0.3)), inset 0 0 8px rgba(255,255,255,0.02); }
    50% { box-shadow: 0 0 28px var(--mod-glow, rgba(226,18,39,0.3)), inset 0 0 16px rgba(255,255,255,0.04); }
  }
  .fp-scan-line {
    position: absolute; inset-x: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--mod-color, rgba(226,18,39,0.5)), transparent);
    animation: fp-scan 8s linear infinite;
    pointer-events: none;
    box-shadow: 0 0 8px var(--mod-color, rgba(226,18,39,0.4));
  }
`;

// Wrapper that converts any modal (overlay style) to a full-page view
function FullPageWrapper({ children, moduleId, onBack }: { children: React.ReactNode; moduleId: ArsenalModuleId; onBack: () => void }) {
  const mod = ARSENAL_MODULES.find(m => m.id === moduleId);
  const color = mod?.color ?? "#e21227";
  const glow = mod?.glow ?? "rgba(226,18,39,0.3)";

  return (
    <motion.div
      key={moduleId}
      initial={{ opacity: 0, scale: 0.97, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 20 }}
      transition={{ duration: 0.22, type: "spring", stiffness: 200, damping: 26 }}
      className="fixed inset-0 z-40 flex flex-col"
      style={{
        background: `linear-gradient(160deg, #040406 0%, #020203 50%, #030306 100%)`,
        "--mod-color": color,
        "--mod-glow": glow
      } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: FULLPAGE_CSS }} />

      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.025 }} preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id={`fp-hx-${moduleId}`} x="0" y="0" width="44" height="50.8" patternUnits="userSpaceOnUse">
              <polygon points="22,2 42,13 42,37 22,48 2,37 2,13" fill="none" stroke={color} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#fp-hx-${moduleId})`} />
        </svg>
        <div className="fp-scan-line" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 pointer-events-none" style={{
          background: `radial-gradient(ellipse at 50% 0%, ${color}08 0%, transparent 70%)`
        }} />
      </div>

      {/* 3D Futuristic Top Bar */}
      <div
        className="relative z-10 flex items-center gap-3 px-5 py-3 shrink-0"
        style={{
          borderBottom: `1px solid ${color}20`,
          background: `linear-gradient(90deg, ${color}06 0%, transparent 50%, ${color}03 100%)`,
          boxShadow: `0 4px 30px rgba(0,0,0,0.5), 0 0 0 1px ${color}08`
        }}
      >
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.04, x: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-all"
          style={{
            color,
            border: `1px solid ${color}30`,
            background: `${color}08`,
            boxShadow: `0 0 12px ${glow}`
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          ARSENAL
        </motion.button>

        {/* Separator */}
        <div className="w-px h-6" style={{ background: `${color}20` }} />

        {/* Module info */}
        {mod && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                animate={{ boxShadow: [`0 0 12px ${glow}`, `0 0 24px ${glow}`, `0 0 12px ${glow}`] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${color}25, rgba(0,0,0,0.9))`,
                  border: `1px solid ${color}40`,
                }}
              >
                <mod.icon style={{ color, width: 18, height: 18, filter: `drop-shadow(0 0 6px ${color})` }} />
              </motion.div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{
                background: "#10b981",
                boxShadow: "0 0 6px #10b981",
                border: "1.5px solid #020203"
              }} />
            </div>
            <div>
              <div className="text-[13px] font-black tracking-wide" style={{
                color,
                textShadow: `0 0 16px ${color}60`,
                animation: "fp-title-glow 3s ease-in-out infinite"
              }}>
                {mod.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8.5px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{mod.subtitle}</span>
                <span className="text-[6.5px] font-black px-1.5 py-0.5 rounded-full font-mono tracking-widest" style={{
                  background: `${color}15`,
                  border: `1px solid ${color}35`,
                  color
                }}>{mod.tag}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-2">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            <span className="text-[8px] font-black font-mono tracking-widest" style={{ color: "#10b981" }}>LIVE</span>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#444" }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Modal content rendered full-screen */}
      <div className="flex-1 overflow-hidden relative z-10">
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
      // Batch 9 — Security Tooling + AI Safety + Advanced Intelligence
      case "securitykanban":      return <SecurityKanbanModal open={open} onOpenChange={v => !v && onBack()} />;
      case "networkmonitor":      return <NetworkMonitorModal open={open} onOpenChange={v => !v && onBack()} />;
      case "openskynet":          return <OpenSkynetModal open={open} onOpenChange={v => !v && onBack()} />;
      case "defensiveai":         return <DefensiveAIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "threatdetect":        return <ThreatDetectionModal open={open} onOpenChange={v => !v && onBack()} />;
      case "deepfake":            return <DeepfakeDetectorModal open={open} onOpenChange={v => !v && onBack()} />;
      case "misinfo":             return <MisinfoDetectorModal open={open} onOpenChange={v => !v && onBack()} />;
      case "cyberconsciousness":  return <CyberConsciousnessModal open={open} onOpenChange={v => !v && onBack()} />;
      case "behavioraldna":       return <BehavioralDNAModal open={open} onOpenChange={v => !v && onBack()} />;
      case "incidentresponse":    return <IncidentResponseModal open={open} onOpenChange={v => !v && onBack()} />;
      case "intelfabric":         return <IntelligenceFabricModal open={open} onOpenChange={v => !v && onBack()} />;
      case "temporalthreat":      return <TemporalThreatModal open={open} onOpenChange={v => !v && onBack()} />;
      case "cyberevolution":      return <CyberEvolutionModal open={open} onOpenChange={v => !v && onBack()} />;
      case "malwareanalysis":     return <MalwareAnalysisModal open={open} onOpenChange={v => !v && onBack()} />;
      case "aisafety":            return <AISafetyModal open={open} onOpenChange={v => !v && onBack()} />;
      case "multireality":        return <MultiRealityModal open={open} onOpenChange={v => !v && onBack()} />;
      case "zeroboundary":        return <ZeroBoundaryModal open={open} onOpenChange={v => !v && onBack()} />;
      case "globalintelsync":     return <GlobalIntelSyncModal open={open} onOpenChange={v => !v && onBack()} />;
      case "privacyrisk":         return <PrivacyRiskModal open={open} onOpenChange={v => !v && onBack()} />;
      case "crossdomain":         return <CrossDomainRiskModal open={open} onOpenChange={v => !v && onBack()} />;
      case "selfimprove":         return <SelfImprovingModal open={open} onOpenChange={v => !v && onBack()} />;
      case "hyperadaptive":       return <HyperAdaptiveModal open={open} onOpenChange={v => !v && onBack()} />;
      case "causalreason":        return <CausalReasoningModal open={open} onOpenChange={v => !v && onBack()} />;
      case "fullspectrum":        return <FullSpectrumAIModal open={open} onOpenChange={v => !v && onBack()} />;
      case "autonomousoversight": return <AutonomousOversightModal open={open} onOpenChange={v => !v && onBack()} />;
      case "largescaleanomaly":   return <LargeScaleAnomalyModal open={open} onOpenChange={v => !v && onBack()} />;
      case "artpplatform":    return <ARTPlatformModal open={open} onOpenChange={v => !v && onBack()} />;
      case "pentestlabpro":   return <PentestLabProModal open={open} onOpenChange={v => !v && onBack()} />;
      case "soccommand":      return <SOCCommandModal open={open} onOpenChange={v => !v && onBack()} />;
      case "autonomousdecisionengine": return <AutonomousDecisionEngineModal open={open} onOpenChange={v => !v && onBack()} />;
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
