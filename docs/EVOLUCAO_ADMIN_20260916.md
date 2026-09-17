# Evolucao administrativa - entrega de 16/09/2026

> Revisado: as orientacoes finais de seguranca, ativacao e testes estao em
> [REVISAO_CIRURGICA_20260916.md](./REVISAO_CIRURGICA_20260916.md).
> Esse documento registra a evolucao anterior; a revisao prevalece.

## Ativacao no Supabase

A migration foi criada e testada em um PostgreSQL local descartavel (PGlite).
Nao foi executada no Supabase de producao. Nenhum dado real foi criado, alterado ou arquivado nos testes.

1. Confirme o backup e teste primeiro em uma copia de homologacao do banco.
2. Planeje uma janela coordenada de manutencao para SQL e codigo: o banco passa a exigir demanda explicita, e o novo endpoint exige a RPC. Nao aplicar isoladamente enquanto a versao antiga recebe reservas.
3. Somente apos homologacao e autorizacao, executar o arquivo SQL completo e publicar a versao correspondente, sem deixar trafego de gravacao na janela intermediaria.
4. Execute o roteiro em homologacao primeiro. Nao houve commit, push, deploy ou migration em producao nesta tarefa.

A migration adiciona a `bookings`: `booking_type`, `scheduled_date`, `scheduled_time`, `demand`, `requester_email` e `archived_at`. Mantem IDs, sessoes, candidatos e historicos. Nao edita migrations antigas.

Tambem adiciona `booking_candidates.archived_at`, atualiza `test_room_sessions_with_availability` e cria `create_manual_booking`, `create_principal_booking`, `lock_booking_session`, `archive_exported_candidates`, a view privada `admin_booking_report_rows` e as funcoes `admin_week_report` e `admin_candidate_fingerprint`. As novas operacoes privilegiadas ficam restritas a `service_role`. A view de disponibilidade preserva ACLs anteriores e usa `security_invoker=true`. A autenticacao administrativa existente nao foi modificada.

## Comportamento implementado

- Sidebar: Agendamentos Principais, Agendamentos Avulsos, Exportar Relatorio e Configuracao desabilitada.
- Principais: fluxo publico, incluindo online sem sessao presencial. Tipos historicos nulos sao tratados como principal.
- Avulsos: booking e um candidato criados juntos, com data/hora propria. Nunca criam sessao publica. Coincidencia exata de data/hora com uma sessao existente consome vaga.
- Demanda: obrigatoria para novos registros, editavel no admin e filtravel. Valores historicos nulos aparecem como nao informados.
- Responsavel solicitante: email de contato no fluxo publico; email autenticado do admin no fluxo interno. Valores antigos nulos nao sao inventados.
- Publico: unica inclusao visual e o campo Demanda. Avulsos nao podem usar gerenciamento por token publico. Rotas e regras de reagendamento continuam as existentes.
- Relatorio: XLSX de segunda a sexta, por candidato, com dez colunas e origem derivada do dominio do email. Para online, usa a data de criacao em America/Sao_Paulo.
- Arquivamento: acao separada e confirmada por candidato exportado e inalterado. O comprovante assinado expira em uma hora e pertence ao admin que exportou.
- Candidatos em semanas diferentes sao arquivados independentemente. O candidato da outra semana permanece ativo. `bookings.archived_at` e apenas agregado e fica nulo enquanto houver candidato ativo.
- Arquivar nao altera vagas, status, historicos ou sessoes. Arquivados continuam em exportacoes futuras da mesma semana.
- As tabelas agora abrangem todas as frentes por padrao. O query param legado `empresa` continua aceito quando informado.

## Novas APIs

Todas verificam a sessao administrativa no servidor:

| Metodo | Rota | Entrada |
| --- | --- | --- |
| POST | `/api/admin/bookings/create-manual` | Empresa, contato, demanda, data, horario, candidato e cargo |
| POST | `/api/admin/bookings/update-demand` | `booking_id`, `demand` |
| GET | `/api/admin/reports/export?week=YYYY-MM-DD` | Uma data da semana |
| POST | `/api/admin/reports/archive-week` | `receipt` recebido na exportacao |

A exportacao retorna o XLSX em base64, nome do arquivo e comprovante assinado; a interface baixa um arquivo `.xlsx`. A chave do servidor nao e enviada ao navegador. Criar avulso, alterar demanda e arquivar nao enviam emails.

## Arquivos alterados

Raiz de todos os caminhos: `C:/Users/tomaz/lince-agendamentos/`.

- `app/admin/page.tsx`
- `app/admin/agendamentos/[id]/page.tsx`
- `app/api/admin/candidates/mark-no-show/route.ts` (data/hora do avulso no fluxo existente)
- `app/api/bookings/route.ts`
- `app/api/public/candidates/cancel/route.ts`
- `app/api/public/candidates/reschedule/route.ts`
- `app/confirmado/page.tsx`
- `app/status/[token]/page.tsx`
- `components/AdminFilters.tsx`
- `components/AdminSidebar.tsx`
- `components/BookingForm.tsx`
- `types/index.ts`
- `package.json`
- `package-lock.json`

## Arquivos criados

- `app/admin/agendamentos-avulsos/page.tsx`
- `app/admin/exportar-relatorio/page.tsx`
- `app/api/admin/bookings/create-manual/route.ts`
- `app/api/admin/bookings/update-demand/route.ts`
- `app/api/admin/reports/export/route.ts`
- `app/api/admin/reports/archive-week/route.ts`
- `components/AdminBookingsPage.tsx` (tabela compartilhada)
- `components/AdminBookingActions.tsx` (edicao de demanda e formulario avulso)
- `components/AdminModal.tsx`
- `components/AdminReportForm.tsx`
- `lib/adminReports.ts`
- `lib/bookingOperations.ts`
- `supabase/migrations/202609160001_add_booking_type_demand_requester_archive.sql`
- `tests/database-fixture.mjs`
- `tests/booking-operations.test.ts`
- `tests/preview-server.mjs`
- `tests/admin-api-check.mjs`
- `docs/EVOLUCAO_ADMIN_20260916.md`

## Dependencias

- Producao: `exceljs` para XLSX e `lucide-react` para os icones.
- Desenvolvimento: `@electric-sql/pglite` para testes SQL isolados e `tsx` para executar os testes TypeScript.
- Override de `uuid` usado pelo ExcelJS para `11.1.1`; nao alterou a versao do Next.
- Novo comando: `npm.cmd test`.

## Validacoes executadas

- `npm.cmd run lint`: aprovado.
- `npm.cmd run build`: aprovado.
- `npm.cmd test`: aprovado, incluindo migration reaplicavel, historicos, transacoes, ocupacao, relatorio e arquivamento.
- Integracao local: `node tests/admin-api-check.mjs`, com `node tests/preview-server.mjs` ativo. Aprovados autenticacao, validacoes, identidade do solicitante, avulso, demanda, observacoes, realizado, detalhe, XLSX, comprovante invalido, alteracao apos exportacao e arquivamento sem liberar vagas.
- Regressao local: criacao publica presencial/online com dois candidatos, `candidate_session_id`, confirmacao, status, reagendamento individual, cancelamento individual e bloqueio de avulso no fluxo publico.
- Browser: telas administrativas, navegacao, tabela com rolagem horizontal, modal avulso em domingo com horario livre, exportacao e modal de confirmacao. Validacao visual em desktop e painel estreito; falta homologar em aparelhos moveis reais.
- A validacao visual inicial foi feita antes da revisao; os testes finais de arquivamento por candidato estao documentados na revisao cirurgica.
- Emails: nao enviados durante testes. Templates e integracao Resend nao foram alterados; entrega real precisa de homologacao.

Os testes locais usam dados ficticios e chaves falsas. O servidor de fixture escuta apenas em loopback e nao le `.env.local`; nao deve ser publicado. O Next iniciado pelo fixture recebe explicitamente as variaveis falsas, sem modificar o arquivo de ambiente do projeto.

## Preview local entregue

O preview da entrega anterior respondeu em `http://localhost:3000`. Isso nao garante um servidor ativo agora. Na revisao seguinte foi usado apenas o fixture isolado em `localhost:3001`, com dados ficticios e emails desativados. Consulte a revisao para os resultados finais.

Logs do processo local: `.next/local-dev.log` e `.next/local-dev-error.log`, ignorados pelo Git.

## Roteiro manual apos aplicar a migration

1. Sem login, abra `/admin`, `/admin/agendamentos-avulsos` e `/admin/exportar-relatorio`: devem levar ao login. Apos entrar, confirme os tres itens e o destaque ativo da sidebar.
2. Em Principais, confira historicos, data/hora presencial e data da solicitacao online. Teste filtros de modalidade, horario, status, data e demanda.
3. Altere a demanda, salve e recarregue. Confirme que todos os candidatos do mesmo booking mostram a nova demanda. Historicos sem demanda/solicitante devem exibir o fallback.
4. Crie um avulso em domingo, em horario sem sessao publica. Confirme data/hora e email do admin na tabela. Verifique que nenhuma sessao publica foi criada e nenhuma vaga mudou.
5. Numa sessao de 15 lugares, valide: 0 candidatos = 15 livres; 5 principais = 10 livres; mais 2 avulsos no mesmo horario = 8 livres. Avulso em outro horario nao altera essa sessao.
6. Em registros de teste, confira os botoes: confirmado permite ausencia/realizado; ausente bloqueia os dois; realizado mostra apenas REALIZADO desabilitado. Ver, salvar observacao e excluir continuam funcionando. Cancelado nao ocupa; realizado e ausente continuam ocupando.
7. Exporte a semana e abra o XLSX: dez colunas, datas brasileiras, nomes/cargos corretos, demanda, email completo e origem. Teste dominios Lince, Psicoespaco e externo, inclusive maiusculas.
8. Confira que exportar sozinho nao arquiva. Cancele o modal e confirme que nada mudou. Depois confirme o arquivamento: linhas somem da operacao, mas dados e vagas permanecem iguais. Reexporte para conferir o historico.
9. Exporte, altere uma observacao compartilhada e tente arquivar: deve pedir nova exportacao. Com candidatos em semanas diferentes, arquive uma semana: apenas seu candidato desaparece, e o outro permanece ativo.
10. Pelo publico, crie presencial e online com varios candidatos e demanda. Confira confirmacao, token, emails reais e empresa. Reagende/cancele um candidato e confira que os demais nao mudaram.
11. Confira as tres telas em desktop e celular, inclusive rolagem horizontal da tabela e rolagem interna do modal.

## Limites e riscos preexistentes

- A migration e os fluxos precisam ser homologados no Supabase real antes do deploy; os testes SQL usam uma replica local do schema, nao o ambiente de producao.
- O endpoint legado `app/api/update-status/route.ts` usa cliente privilegiado sem verificacao de sessao no proprio handler. Nao foi alterado por estar fora do escopo de autenticacao, mas requer uma correcao de seguranca separada antes de expor esse endpoint.
- O `npm audit` identificou vulnerabilidades preexistentes, incluindo nivel critico na versao atual do Next. Nao foi usado `audit fix --force` nem feita atualizacao major silenciosa. Planejar atualizacao e regressao dedicada.
- A revisao corrigiu a concorrencia entre criacao publica e avulsa, com teste real de duas conexoes PostgreSQL. Concorrencia envolvendo o endpoint legado de reagendamento individual nao foi alterada; veja os limites na revisao.
- Exportacao monta o XLSX em memoria. Validar tamanho/latencia no volume real da semana e limites do plano da Vercel.
- Configuracao, reabertura de semana, historico visual de arquivos e indicadores continuam fora do escopo.
