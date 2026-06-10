## MVP Simples Capacity Planner

Criar uma nova ferramenta no módulo NPI chamada **"MVP Simples Capacity Planner"**, baseada no Capacity Planner existente, porém com escopo reduzido.

### 1. Nova rota e Hub

- Adicionar rota `/npi/capacity-planner-mvp` em `src/App.tsx`.
- Criar `src/pages/npi-planner-mvp/CapacityPlannerMVPHub.tsx`, baseado em `CapacityPlannerHub.tsx`, mas contendo apenas:
  - **Quick actions**: New Part / Job
  - **Trackers**: Job Tracker, Machine Calendar
  - **Configuration**: Machines, Settings
- Remover dos grupos:
  - Insights & KPIs (Dashboard, Machine Capacity, Reports)
  - Catalogs (Materials Catalog, Tooling Catalog)
  - Trackers > Material Tracker e Tooling Tracker

### 2. Acesso pelo /npi

- Adicionar um novo tile "MVP Simples Capacity Planner" na página `src/pages/NPIHub.tsx`, ao lado do Capacity Planner atual.

### 3. Páginas

- Reutilizar as páginas existentes (`PartSetup`, `JobList`, `JobDetail`, `MachineCalendar`, `PlannerSettings`) — apenas registrar rotas espelhadas sob `/npi/capacity-planner-mvp/...` apontando para os mesmos componentes, para que botões "voltar" e navegação fiquem dentro do contexto MVP.
- Rotas a criar:
  - `/npi/capacity-planner-mvp/parts/new` → `PartSetup`
  - `/npi/capacity-planner-mvp/parts/:id` → `JobDetail`
  - `/npi/capacity-planner-mvp/jobs` → `JobList`
  - `/npi/capacity-planner-mvp/calendar` → `MachineCalendar`
  - `/npi/capacity-planner-mvp/settings` → `PlannerSettings`

### 4. Backend / dados

- Sem mudanças. Usa as mesmas tabelas (`npi_parts`, `npi_machines`, etc.) do planner atual — esta ferramenta é apenas uma visão simplificada do mesmo conjunto de dados.

### Detalhes técnicos

- Nenhuma migração de banco, nenhuma alteração nos hooks (`useNPIPlanning`) ou componentes compartilhados.
- Mudança restrita a: `src/App.tsx`, `src/pages/NPIHub.tsx`, novo arquivo `CapacityPlannerMVPHub.tsx`.

### Pergunta

Os back buttons das páginas reutilizadas hoje voltam para `/npi/capacity-planner`. Quer que eu deixe assim mesmo (compartilhado) ou prefere que detectem o contexto MVP e voltem para `/npi/capacity-planner-mvp`? A opção compartilhada é mais rápida; a contextual exige pequena lógica de detecção via `useLocation`.