import { registerQAQCActions }  from './actions.js';
import { registerQAQCMenus }    from './menus.js';
import { registerQAQCRoutes }   from './routes.js';
import { registerQAQCCronjobs } from './cronjobs.js';
import { providerRegistry }     from '../../../core/provider-registry.js';

import { IbshiErpSSOProvider }      from './providers/IbshiErpSSOProvider.js';
import { IbshiErpWebhookProvider }  from './providers/IbshiErpWebhookProvider.js';
import { IbshiErpProjectsProvider } from './providers/IbshiErpProjectsProvider.js';
import { IbshiErpNASProvider }      from './providers/IbshiErpNASProvider.js';
import { AIStandardsLookupProvider } from './providers/AIStandardsLookupProvider.js';
import { AIMTCCrossCheckProvider }   from './providers/AIMTCCrossCheckProvider.js';
import { hooks }                     from '../../../core/hooks.js';
import { WebhookOutboundService }    from './services/WebhookOutboundService.js';

export default async function registerQAQCModule(app) {
  // 1. Register provider classes
  providerRegistry.register('ibshi-erp-sso',       IbshiErpSSOProvider,       'qaqc', 'ERP SSO / user sync');
  providerRegistry.register('ibshi-erp-webhook',   IbshiErpWebhookProvider,   'qaqc', 'ERP outbound webhook');
  providerRegistry.register('ibshi-erp-projects',  IbshiErpProjectsProvider,  'qaqc', 'ERP project snapshot sync');
  providerRegistry.register('ibshi-erp-nas',       IbshiErpNASProvider,       'qaqc', 'NAS file listing');
  providerRegistry.register('ai-standards-lookup', AIStandardsLookupProvider, 'qaqc', 'AI-1 standards lookup (rule-based / Gemini)');
  providerRegistry.register('ai-mtc-crosscheck',   AIMTCCrossCheckProvider,   'qaqc', 'AI-2 MTC cross-check (rule-based / Gemini)');

  // 2. Register actions, menus, routes, cronjobs
  registerQAQCActions();
  registerQAQCMenus();
  registerQAQCRoutes(app);
  registerQAQCCronjobs();

  // 3. Outbound webhook hook: fire after MIR decision
  hooks.addAction('qaqc.mir.decided', async ({ mirId, decision }) => {
    await WebhookOutboundService.send('mir.decided', { mir_id: mirId, decision });
  });
}
