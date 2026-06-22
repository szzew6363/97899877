-- ============================================================
-- Development Seeds — Realistic Test Data
-- Run ONLY in development: psql $DATABASE_URL -f seeds/dev.sql
-- ============================================================

-- Clear in safe order
TRUNCATE webhook_deliveries, webhooks, api_keys, reports,
         document_chunks, documents, knowledge_bases,
         user_modules, modules, projects, team_members, teams,
         notifications, security_events, api_usage,
         agent_runs, messages, conversations,
         subscriptions, users
RESTART IDENTITY CASCADE;

-- ── USERS ─────────────────────────────────────────────────────
INSERT INTO users (id, email, email_verified, username, display_name, avatar_url, tier, timezone, theme, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@mr7.ai',     true, 'admin',    'System Admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',    'elite',        'UTC',       'dark', true),
  ('00000000-0000-0000-0000-000000000002', 'alice@example.com',true, 'alice',    'Alice Chen',   'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',    'professional', 'America/New_York', 'dark', true),
  ('00000000-0000-0000-0000-000000000003', 'bob@example.com',  true, 'bob',      'Bob Martinez', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',      'starter',      'Europe/London',   'dark', true),
  ('00000000-0000-0000-0000-000000000004', 'carol@example.com',true, 'carol',    'Carol White',  'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',    'free',         'Asia/Tokyo',      'dark', true),
  ('00000000-0000-0000-0000-000000000005', 'dev@test.local',   true, 'devtest',  'Dev Tester',   'https://api.dicebear.com/7.x/avataaars/svg?seed=devtest',  'elite',        'UTC',       'dark', true);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
INSERT INTO subscriptions (user_id, plan, billing_cycle, price_usd, status, limits, usage_reset_at, messages_used, tokens_used)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'elite',        'yearly',  299.00, 'active',   '{"messagesPerDay":999999,"agentRuns":999999,"apiKeys":100}',    NOW() + INTERVAL '1 month', 1200, 4500000),
  ('00000000-0000-0000-0000-000000000002', 'professional', 'monthly',  49.00, 'active',   '{"messagesPerDay":2000,"agentRuns":500,"apiKeys":20}',          NOW() + INTERVAL '1 month',  340, 850000),
  ('00000000-0000-0000-0000-000000000003', 'starter',      'monthly',  19.00, 'active',   '{"messagesPerDay":500,"agentRuns":50,"apiKeys":5}',             NOW() + INTERVAL '1 month',   85, 210000),
  ('00000000-0000-0000-0000-000000000004', 'free',         'monthly',   0.00, 'active',   '{"messagesPerDay":50,"agentRuns":5,"apiKeys":1}',               NOW() + INTERVAL '1 month',   12, 18000),
  ('00000000-0000-0000-0000-000000000005', 'elite',        'yearly',  299.00, 'active',   '{"messagesPerDay":999999,"agentRuns":999999,"apiKeys":100}',    NOW() + INTERVAL '1 month',    0, 0);

-- ── TEAMS ─────────────────────────────────────────────────────
INSERT INTO teams (id, owner_id, name, slug, description, plan, max_members)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Red Team Alpha', 'red-team-alpha', 'Elite offensive security team', 'elite', 10),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Blue Team Dev',  'blue-team-dev',  'Defensive security & development', 'professional', 5);

INSERT INTO team_members (team_id, user_id, role, joined_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner',  NOW()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin',  NOW()),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'member', NOW()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner',  NOW()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'member', NOW());

-- ── PROJECTS ──────────────────────────────────────────────────
INSERT INTO projects (team_id, owner_id, name, description, status, visibility)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Operation Nightfall', 'APT simulation exercise Q3', 'active', 'team'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Web App Audit 2025',  'Full-scope web app pentest', 'active', 'team'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'SIEM Integration',    'Blue team detection rules', 'active', 'team');

-- ── CONVERSATIONS ─────────────────────────────────────────────
INSERT INTO conversations (id, user_id, title, model, mode, message_count, total_tokens, last_message_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'SQLi Bypass Techniques',   'gpt-4o',            'standard', 12, 8400,  NOW() - INTERVAL '2 hours'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'OSINT on Target Corp',     'claude-opus-4-5',   'standard',  8, 5200,  NOW() - INTERVAL '1 day'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Network Recon Plan',       'gpt-4o',            'council',   6, 9100,  NOW() - INTERVAL '3 days'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Multi-Agent APT Sim',      'gpt-4o',            'fusion',   20, 45000, NOW() - INTERVAL '1 hour'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Dev Test Conversation',    'gpt-4o-mini',       'standard',  3, 1200,  NOW() - INTERVAL '30 minutes');

-- ── MESSAGES ──────────────────────────────────────────────────
INSERT INTO messages (conversation_id, role, content, model, prompt_tokens, completion_tokens, total_tokens, response_ms, finish_reason)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'user',      'What are the most effective SQLi bypass techniques for WAF evasion?', NULL, 18, 0, 18, NULL, NULL),
  ('20000000-0000-0000-0000-000000000001', 'assistant', 'For WAF bypass via SQL injection, consider: 1. Comment obfuscation using /**/ or /*!...*/. 2. URL encoding and double encoding. 3. Case variation and whitespace manipulation. 4. HTTP parameter pollution. 5. JSON-based payloads where supported.', 'gpt-4o', 120, 380, 500, 1240, 'stop'),
  ('20000000-0000-0000-0000-000000000004', 'user',      'Initialize multi-agent APT simulation targeting a healthcare provider', NULL, 22, 0, 22, NULL, NULL),
  ('20000000-0000-0000-0000-000000000004', 'assistant', 'Initiating FUSION mode. Coordinating: [RECON-AGENT], [EXPLOIT-AGENT], [PERSISTENCE-AGENT], [EXFIL-AGENT]. Phase 1: Passive reconnaissance initiated...', 'gpt-4o', 350, 1200, 1550, 2100, 'stop');

-- ── AGENT RUNS ────────────────────────────────────────────────
INSERT INTO agent_runs (user_id, agent_type, agent_name, status, input, output, started_at, ended_at, duration_ms, tokens_used, tool_calls_count)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'osint',   'JARVIS OSINT',       'completed', '{"target":"example.com"}', '{"emails":12,"subdomains":34,"technologies":["nginx","PHP 8.1","MySQL"]}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', 298000, 4200, 18),
  ('00000000-0000-0000-0000-000000000002', 'pentest', 'Parseltongue SQLi',  'completed', '{"url":"http://testsite.local/login"}', '{"vulnerabilities":[{"type":"sqli","severity":"critical","param":"username"}]}', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours 48 minutes', 720000, 8100, 42),
  ('00000000-0000-0000-0000-000000000001', 'fusion',  'Multi-Agent Council','running',   '{"objective":"Full APT simulation","phase":"persistence"}', '{}', NOW() - INTERVAL '30 minutes', NULL, NULL, 12400, 67),
  ('00000000-0000-0000-0000-000000000003', 'network', 'Network Scanner',    'failed',    '{"cidr":"10.0.0.0/24"}', '{}', NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours 58 minutes', 120000, 200, 3);

-- ── API USAGE ─────────────────────────────────────────────────
INSERT INTO api_usage (user_id, endpoint, method, provider, model, status_code, latency_ms, is_success, prompt_tokens, completion_tokens, total_tokens, cost_usd, billing_period)
VALUES
  ('00000000-0000-0000-0000-000000000002', '/api/chat/stream', 'POST', 'openai',    'gpt-4o',       200, 1240, true, 120, 380, 500, 0.007500, '2025-01'),
  ('00000000-0000-0000-0000-000000000002', '/api/chat/stream', 'POST', 'openai',    'gpt-4o',       200, 980,  true, 95,  210, 305, 0.004575, '2025-01'),
  ('00000000-0000-0000-0000-000000000003', '/api/chat/stream', 'POST', 'anthropic', 'claude-opus-4-5', 200, 2100, true, 200, 600, 800, 0.024000, '2025-01'),
  ('00000000-0000-0000-0000-000000000004', '/api/chat/stream', 'POST', 'openai',    'gpt-4o-mini',  200, 440,  true, 50,  120, 170, 0.000255, '2025-01'),
  ('00000000-0000-0000-0000-000000000002', '/api/agents/run',  'POST', 'openai',    'gpt-4o',       429, 15,   false, 0,  0,  0,   0,        '2025-01');

-- ── SECURITY EVENTS ───────────────────────────────────────────
INSERT INTO security_events (user_id, event_type, severity, ip_address, country_code, description, outcome, requires_action)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'login_success',        'info',   '192.168.1.10', 'US', 'Successful login',                     'success', false),
  ('00000000-0000-0000-0000-000000000003', 'login_failed',         'medium', '45.33.32.156', 'RU', 'Invalid password attempt (3rd)',       'failure', false),
  ('00000000-0000-0000-0000-000000000003', 'login_failed',         'high',   '45.33.32.156', 'RU', 'Account locked after 5 failed attempts','blocked', true),
  ('00000000-0000-0000-0000-000000000001', 'api_key_created',      'info',   '10.0.0.1',     'US', 'New API key created: prod-key-1',       'success', false),
  ('00000000-0000-0000-0000-000000000002', 'suspicious_activity',  'high',   '198.51.100.42','CN', 'Unusual access pattern detected',       'detected',true);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
INSERT INTO notifications (user_id, type, title, body, priority, action_url, action_label)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'agent_complete', 'OSINT Scan Complete',        'Your JARVIS OSINT scan on example.com found 34 subdomains.',  'normal', '/agents/history', 'View Results'),
  ('00000000-0000-0000-0000-000000000002', 'security',       'Suspicious Login Detected',  'Login attempt from IP 45.33.32.156 (Russia) was blocked.',    'high',   '/security/events','Review Event'),
  ('00000000-0000-0000-0000-000000000003', 'billing',        'Usage at 85%',               'You have used 85% of your monthly message quota.',            'high',   '/billing',        'Upgrade Plan'),
  ('00000000-0000-0000-0000-000000000004', 'welcome',        'Welcome to mr7.ai',          'Start by exploring the Arsenal Hub — 18+ security tools.',    'normal', '/arsenal',        'Explore Tools'),
  ('00000000-0000-0000-0000-000000000001', 'system',         'System Update Complete',     'Platform updated to v2.5.0. See changelog for details.',      'low',    '/changelog',      'View Changelog');

-- ── MODULES ───────────────────────────────────────────────────
INSERT INTO modules (slug, name, description, category, author_name, is_free, required_tier, is_published, is_verified, is_featured, install_count, rating, rating_count, tags)
VALUES
  ('jarvis-osint',      'JARVIS OSINT',         'AI-powered open source intelligence gathering',        'osint',    'mr7.ai Team', true,  'free',         true, true, true,  2840, 4.8, 342, '["osint","recon","ai"]'),
  ('parseltongue',      'Parseltongue SQLi',     'Advanced SQL injection detection and exploitation',   'pentest',  'mr7.ai Team', false, 'starter',      true, true, true,  1920, 4.7, 218, '["sqli","pentest","web"]'),
  ('network-viper',     'Network Viper',         'Comprehensive network scanning and enumeration',      'network',  'mr7.ai Team', true,  'free',         true, true, false, 1540, 4.5, 189, '["network","scan","nmap"]'),
  ('stealth-mode',      'Stealth Mode',          'Anti-detection and evasion techniques module',       'pentest',  'mr7.ai Team', false, 'professional', true, true, true,   980, 4.9, 97,  '["evasion","stealth","apt"]'),
  ('crypto-breaker',   'Crypto Analyzer',        'Cryptographic analysis and hash cracking assistant', 'crypto',   'mr7.ai Team', false, 'starter',      true, true, false,  730, 4.6, 88,  '["crypto","hash","cipher"]'),
  ('council-mode',      'Council Mode',          'Multi-agent AI council for complex analysis',        'ai',       'mr7.ai Team', false, 'elite',        true, true, true,   560, 5.0, 62,  '["multi-agent","ai","council"]');

-- ── KNOWLEDGE BASES ───────────────────────────────────────────
INSERT INTO knowledge_bases (id, user_id, name, description, document_count, chunk_count)
VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'CVE Database 2024',      'Common vulnerabilities and exposures reference',    45, 1823),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'MITRE ATT&CK Framework', 'Complete ATT&CK techniques and sub-techniques',      200, 8940),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Network Protocols',      'TCP/IP, HTTP, DNS, TLS protocol specifications',     28, 1120);

-- ── REPORTS ───────────────────────────────────────────────────
INSERT INTO reports (user_id, team_id, title, report_type, status, risk_level, executive_summary, findings, recommendations)
VALUES
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Web Application Pentest — TargetCorp Q1 2025', 'pentest', 'ready', 'critical',
   'Critical SQL injection vulnerabilities found in authentication module. Immediate remediation required.',
   '[{"id":"F001","severity":"critical","title":"SQLi in /login","description":"Authentication bypass via UNION-based injection"},{"id":"F002","severity":"high","title":"XSS in search","description":"Reflected XSS in search parameter"}]',
   '[{"priority":"immediate","action":"Parameterized queries for all DB calls"},{"priority":"short-term","action":"WAF deployment with custom ruleset"}]'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'OSINT Intelligence Report — example.com', 'osint', 'ready', 'medium',
   'Exposed infrastructure and personnel data identified through passive reconnaissance.',
   '[{"id":"F001","severity":"medium","title":"Exposed admin portal","description":"Admin interface accessible from internet"},{"id":"F002","severity":"low","title":"Email harvesting","description":"12 employee emails collected from public sources"}]',
   '[{"priority":"short-term","action":"Restrict admin portal to VPN only"},{"priority":"short-term","action":"Enable email privacy on public profiles"}]');

-- ── API KEYS ──────────────────────────────────────────────────
INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, usage_count)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Production Key',  'sha256_hash_placeholder_prod',  'mr7_sk_live_Abc1', '["chat:read","chat:write","reports:read"]', 100, 50000, 1284),
  ('00000000-0000-0000-0000-000000000002', 'Dev Key',         'sha256_hash_placeholder_dev',   'mr7_sk_test_Xyz2', '["chat:read","chat:write"]',               60,  10000, 342),
  ('00000000-0000-0000-0000-000000000001', 'Admin Full Key',  'sha256_hash_placeholder_admin', 'mr7_sk_live_Adm3', '["chat:read","chat:write","admin:read","admin:write","billing:read"]', 999, 999999, 5620);

-- ── WEBHOOKS ──────────────────────────────────────────────────
INSERT INTO webhooks (user_id, name, url, events, success_count, failure_count, last_triggered_at, last_success_at)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'Slack Alerts',      'https://hooks.slack.example.com/T123/B456/xyz', '["agent.completed","security.alert","report.ready"]', 48, 2, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0000-000000000001', 'SIEM Integration',  'https://siem.internal/webhook/mr7ai',           '["security.alert","login_failed","suspicious_activity"]', 230, 0, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes');

ANALYZE;
