import QAQCBaseView          from './QAQCBaseView.vue';
import ProjectsView           from './ProjectsView.vue';
import StandardsListView      from './StandardsListView.vue';
import StandardsDetailView    from './StandardsDetailView.vue';
import StandardsLookupView    from './StandardsLookupView.vue';
import ITPListView            from './ITPListView.vue';
import ITPDetailView          from './ITPDetailView.vue';
import InspectionTaskView     from './InspectionTaskView.vue';
import InspectionFormView     from './InspectionFormView.vue';
import IPDashboardView        from './IPDashboardView.vue';
import MIRListView            from './MIRListView.vue';
import MIRDetailView          from './MIRDetailView.vue';

export default function registerQAQCFrontend(app, router) {
  router.addRoute({
    path: '/qaqc',
    component: QAQCBaseView,
    children: [
      { path: 'projects',                        name: 'QAQCProjects',        component: ProjectsView },
      { path: 'standards',                       name: 'QAQCStandards',       component: StandardsListView },
      { path: 'standards/lookup',                name: 'QAQCStandardsLookup', component: StandardsLookupView },
      { path: 'standards/:id',                   name: 'QAQCStandardDetail',  component: StandardsDetailView },
      { path: 'itp',                             name: 'QAQCITPList',         component: ITPListView },
      { path: 'itp/:id',                         name: 'QAQCITPDetail',       component: ITPDetailView },
      { path: 'inspections',                     name: 'QAQCInspections',     component: InspectionTaskView },
      { path: 'inspections/dashboard',           name: 'QAQCIPDashboard',     component: IPDashboardView },
      { path: 'inspections/:id/form',            name: 'QAQCInspectionForm',  component: InspectionFormView },
      { path: 'mir',                             name: 'QAQCMIRList',         component: MIRListView },
      { path: 'mir/:id',                         name: 'QAQCMIRDetail',       component: MIRDetailView },
    ]
  });
}
