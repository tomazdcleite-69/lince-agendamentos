# Revisao cirurgica - 16/09/2026

## Estado e escopo

Revisao dos seis apontamentos, preservando a evolucao administrativa anterior.
A migration `supabase/migrations/202609160001_add_booking_type_demand_requester_archive.sql` foi corrigida diretamente. Nao foi criada uma migration 002.

Nenhuma migration foi aplicada em producao. Nenhum dado real foi alterado, nenhum email real foi enviado e nao houve commit, push ou deploy. A consulta ao Supabase foi somente de leitura: estrutura, constraints, ACLs, valores distintos de service_company e dominios distintos das contas (sem divulgar enderecos individuais).

## 1. Arquivamento por candidato

- Novo campo: `booking_candidates.archived_at timestamptz`.
- Principais e avulsos usam `components/AdminBookingsPage.tsx`: filtro Supabase `booking_candidates.archived_at IS NULL` e filtro defensivo por candidato na montagem das linhas. Nao filtram pelo arquivamento do booking.
- `bookings.archived_at` fica nulo enquanto houver algum candidato ativo. So recebe data quando todos os candidatos do booking estiverem arquivados.
- A view historica `admin_booking_report_rows` inclui `candidate_archived_at` e NAO remove arquivados. XLSX pode ser gerado novamente.
- `admin_candidate_fingerprint` considera a linha exportada, campos compartilhados relevantes e os dados exportados do proprio candidato, incluindo sua sessao. Nao inclui irmaos, campos nao exportados como telefone, nem o arquivamento agregado do booking.
- Alterar empresa, observacao da empresa, demanda, solicitante, status ou sessao do candidato invalida o comprovante. Alterar apenas o irmao de outra semana nao invalida.
- `archive_exported_candidates` recebe candidate_id + booking_id + fingerprint; bloqueia bookings, candidatos e sessoes efetivas, revalida dados e semana, e arquiva em uma transacao. Qualquer divergencia aborta tudo com "Os dados mudaram. Exporte a semana novamente.".
- Comprovantes HMAC passaram para versao v2, vinculados ao admin e com validade de uma hora. Comprovantes da implementacao antiga nao podem arquivar o novo modelo.
- Exemplo testado: A em 14/09 e B em 23/09. Arquivar A mantem B visivel e booking ativo; arquivar B depois preenche o agregado. Ambos permanecem reexportaveis.
- Arquivar nao cancela, nao remove registros e nao libera vagas.

## 2. Acesso real a disponibilidade e permissoes

Fluxo inspecionado no codigo:

| Arquivo | Acesso |
| --- | --- |
| `app/agendamento/sala-testes/page.tsx` | Server Component consulta a view com `supabaseAdmin`; envia sessoes e valores numericos de available_spots/occupied_spots ao formulario. |
| `components/BookingForm.tsx` | Client Component recebe sessoes por props e envia formulario a `/api/bookings`. Nao consulta Supabase diretamente. |
| `app/api/bookings/route.ts` | Route Handler consulta a view via service role para mensagem antecipada; a RPC faz a validacao final sob lock. |
| `app/status/[token]/page.tsx` | Server Component consulta disponibilidade de reagendamento via `supabaseAdmin`. |
| `app/api/public/candidates/reschedule/route.ts` | Route Handler consulta a view via `supabaseAdmin`. |
| `lib/supabase.ts` | `server-only`: separa cliente anon de Auth e cliente service role. Chave privilegiada nao e serializada nas props nem enviada ao browser. |

A view final usa `security_invoker=true`. Foi removido o REVOKE de anon/authenticated da versao anterior. `CREATE OR REPLACE VIEW` preserva os grants ja presentes e a migration garante explicitamente `GRANT SELECT ... TO service_role`.

ACL observada na view atual de producao, antes da migration: postgres, anon, authenticated e service_role com `arwdDxtm` (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN). Esses grants legados nao foram ampliados nem revogados nesta revisao; nao estamos afirmando que sejam um modelo minimo ideal. O acesso efetivo de uma view invoker depende tambem das permissoes/RLS das tabelas subjacentes. Nao foram abertas tabelas privadas para anon. A aplicacao atual nao depende de SELECT direto do browser nessa view.

Novas funcoes de reserva, relatorio, fingerprint e arquivamento: EXECUTE revogado de PUBLIC/anon/authenticated, concedido apenas a service_role. View administrativa: todos os privilegios revogados de PUBLIC/anon/authenticated e SELECT concedido a service_role. Trigger invoker com search_path vazio, sem EXECUTE publico.

Teste no browser sem login, no ambiente local isolado com o codigo real: `/admin` redirecionou ao login; sem entrar, foi aberta `/agendamento/sala-testes?empresa=lince`. Calendario mostrou sessoes e vagas; selecionamos 17/09/2026 08:30, com 15 vagas e destaque visual correto. Sem 401/403 ou erro de permissao. A fixture exige sua chave service falsa no acesso REST/RPC e executa SQL como service_role. Nao se tratou apenas de uma consulta SQL privilegiada isolada.

## 3. Demanda explicita, sem default no banco

- `ALTER TABLE public.bookings ALTER COLUMN demand DROP DEFAULT`.
- Historicos NULL permanecem NULL e sao apresentados como "Nao informado"; nao houve preenchimento em massa.
- Novo INSERT sem demanda falha. Avulso exige selecao valida na API e no banco.
- A implementacao publica anterior a esta revisao ja oferece as duas demandas e envia a escolhida. Isso foi preservado, incluindo recrutamento_selecao quando selecionado.
- Para compatibilidade com clientes anteriores do formulario de avaliacao psicologica, a API publica ja possuia fallback explicito para avaliacao_psicologica quando o campo esta ausente. Esse valor e enviado explicitamente a RPC; nao existe default SQL escondendo omissao de outro escritor.

## 4. INSERT e UPDATE

Trigger `validate_new_booking_fields`: BEFORE INSERT OR UPDATE OF booking_type, assessment_modality, session_id, scheduled_date, scheduled_time, demand.

Novo NULL e transicao de demanda preenchida para NULL sao rejeitados. Historico que ja tinha NULL pode receber observacao ou outra alteracao valida sem inventar demanda. CHECK preserva valores permitidos.

Invariantes combinam trigger e constraints: principal presencial tem sessao e nao tem data/hora avulsa; principal online nao tem sessao nem data/hora avulsa; avulso e presencial, sem session_id, com scheduled_date e scheduled_time. booking_type NULL continua interpretado como principal.

## 5. Solicitante e service_company

Constraint real aceita `lince`, `psicoespaco`, `espaco_lince`. Na consulta de valores distintos existentes, somente `lince` estava armazenado. Os dominios de contas existentes consultados foram `lincehumanizacao.com` e `psicoespaco.com.br`.

O avulso determina requester_email no servidor a partir de `getCurrentUser().email`, normalizado para minusculas. contact_email continua separado. Dados enviados pelo browser para requester_email/service_company sao ignorados.

`getAdminServiceCompany` reutiliza a regra de Origem: lincehumanizacao.com (e subdominios ja reconhecidos) => lince; psicoespaco.com.br ou psicoespaco.com => psicoespaco. Comparacao case-insensitive. Prefixos/sufixos arbitrarios nao sao aceitos como dominio Psicoespaço.

Dominio desconhecido ou email ausente retorna 403 somente na criacao avulsa, com mensagem orientando procurar administracao. Nao altera login, sessao ou acesso as demais telas. Essa decisao evita atribuir silenciosamente a Lince e e compativel com os dominios atualmente observados. Novas contas externas legitimas exigirao mapeamento explicito antes de criarem avulsos.

Inventario de usos de service_company (diretos e nomes camelCase relacionados):

| Arquivo | Uso |
| --- | --- |
| `types/index.ts` | Valores publicos, booking/insert e contratos de RPC. |
| `lib/serviceCompany.ts` | Normalizacao publica, labels, nomes e logos. |
| `lib/bookingOperations.ts` | Origem e mapeamento seguro para novos avulsos. |
| `app/agendamento/sala-testes/page.tsx` | Parametro empresa e identidade visual; prop do formulario. |
| `components/BookingForm.tsx` | Envio da empresa do servico no payload publico. |
| `app/api/bookings/route.ts` | Normalizacao, persistencia e label passado ao email existente. |
| `app/api/admin/bookings/create-manual/route.ts` | Empresa inferida da identidade autenticada, nunca hardcoded. |
| `components/AdminBookingsPage.tsx` | Filtro legado opcional por empresa e labels das tres frentes. |
| `app/admin/agendamentos/[id]/page.tsx` | Consulta e apresentacao da empresa do servico. |
| `lib/emailTemplates.ts` | Contrato serviceCompanyLabel existente; template nao alterado. |
| `supabase/migrations/202605250001_add_service_company_to_bookings.sql` | Coluna/default historico e constraint existente, inalterados. |
| `supabase/migrations/202609160001_add_booking_type_demand_requester_archive.sql` | Ambas as RPCs gravam valor explicito; avulso valida lince/psicoespaco. |

Fixtures e testes tambem referenciam o campo para verificar persistencia e impedir spoofing. Origem do XLSX usa requester_email, nao troca a semantica de service_company nem de company_name (empresa solicitante).

## 6. Reserva transacional e concorrencia

Antes, o publico consultava vagas e fazia INSERTs separados. Agora apenas o trecho critico usa `create_principal_booking`: bloqueia a sessao, recalcula capacidade, insere booking, todos os N candidatos e historico atomicamente. Emails ficam fora e depois do sucesso da transacao, com templates e integracao existentes preservados.

`create_manual_booking` busca a sessao coincidente por data/hora com FOR UPDATE, sem criar sessao, e usa o mesmo helper `lock_booking_session`. Principal usa o mesmo registro e o mesmo helper antes da validacao final. Avulso sem sessao coincidente continua permitido, sem modificar calendario.

A contagem considera principal por coalesce(candidate_session_id, booking.session_id), avulso por coincidencia exata data/hora, confirmados/realizados/ausentes e booking nao cancelado. Nao considera arquivamento. Principal reserva N lugares ou falha inteiro; online nao ocupa sessao.

No isolamento READ COMMITTED usado no teste, o concorrente aguarda o lock, reconta depois do commit anterior e rejeita se acabou a capacidade. Testamos as duas ordens com conexoes PostgreSQL independentes e confirmamos espera em pg_stat_activity: principal primeiro e avulso primeiro. Nenhuma ordem chegou a 16/15; nenhum booking parcial sobrou.

Referencias tecnicas: [locks de linha PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html) e [RLS e views invoker no Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Validacoes

| Cenario solicitado | Resultado |
| --- | --- |
| 1. Candidatos em semanas distintas | PASS: SQL e API; apenas A some do HTML da tabela, B permanece; agregado preenchido so depois de B. |
| 2. Reexportacao | PASS: XLSX reaberto e nome do candidato arquivado encontrado. |
| 3. Alteracao apos exportacao | PASS: demanda, empresa, notes, requester_email, status e sessao invalidam; nenhuma linha parcialmente arquivada. |
| 4. Historico sem demanda | PASS: NULL preservado, atualizacao nao relacionada aceita; fallback de apresentacao preservado. |
| 5. Novo booking sem demanda | PASS: INSERT rejeitado e API avulsa retorna 400. |
| 6. Booking publico | PASS: presencial e online gravam demanda explicita e dois candidatos. |
| 7. Admin Lince | PASS: requester autenticado e service_company=lince. |
| 8. Admin Psicoespaço | PASS: email autenticado em maiusculas normalizado e service_company=psicoespaco, mesmo com payload tentando lince. |
| 9. Contato separado | PASS: contact_email preservado; requester forjado ignorado. |
| 10. Avulso fora da agenda | PASS: nao cria sessao nem altera vagas. |
| 11. Avulso coincidente | PASS: 8 principais + 1 avulso => 9 ocupadas/6 livres. |
| 12. Avulso cancelado | PASS: deixa de ocupar vaga. |
| 13. Avulso arquivado | PASS: filtro operacional por candidato; ocupacao permanece igual. |
| 14. Ultima vaga | PASS: PostgreSQL 18.4 real, duas conexoes, ambos os vencedores possiveis; 15/15 e rejeicao do concorrente. |
| 15. Multiplos candidatos | PASS: 2 livres e 3 candidatos rejeita inteiro; falha de candidato tambem desfaz booking/candidatos/historico. |
| 16. Agenda publica sem login | PASS: browser com sessao administrativa ausente, calendario/vagas e selecao; fixture isolada com permissoes. |

Outras validacoes: migration aplicada duas vezes; RPCs/view administrativas inacessiveis a anon; endpoints administrativos e paginas protegidos sem login; dominio desconhecido bloqueado; comprovante adulterado recusado; confirmacao/status, reagendamento e cancelamento individuais preservados.

Comandos executados:

- `npm.cmd test`: 5 testes abrangentes passaram, cobrindo os cenarios SQL e helpers.
- `node tests/admin-api-check.mjs`: integracao e regressao passaram com fixture local.
- `node tests/concurrency-check.mjs`: duas disputas de ultima vaga passaram em PostgreSQL real.
- `npm.cmd run lint`: passou.
- `npm.cmd run build`: passou.
- `node tests/preview-server.mjs`: servidor Next dev isolado usado no browser, sem chaves reais e com Resend desativado.
- `git diff --check`: passou; apenas avisos de conversao LF/CRLF do ambiente Windows.

Ao encerrar, o servidor de fixture, a aba temporaria e os clusters PostgreSQL de teste foram fechados. Nenhum preview permanente com dados reais foi iniciado nesta revisao.

Para repetir integracao: iniciar `node tests/preview-server.mjs`, executar `node tests/admin-api-check.mjs`, encerrar o fixture ao terminar. Usa loopback 54329/3001, dados em memoria e ambiente falso; nao publicar esse servidor.

O teste de concorrencia requer `embedded-postgres` instalado separadamente e `LINCE_TEST_PG_MODULE` apontando para seu `dist/index.js`. Nesta execucao, versao 18.4.0-beta.17 instalada em TEMP/lince-postgres-review, sem modificar package.json/lock. Cria cluster descartavel em TEMP, porta 65433/loopback, senha aleatoria e encerra por pg_ctl no Windows. Pastas temporarias ficam retidas; nao instala servico nem acessa URL de producao.

## Arquivos desta revisao

Todos relativos a `C:/Users/tomaz/lince-agendamentos/`. O worktree ja continha a evolucao anterior; ela foi preservada. A lista abaixo e exclusivamente desta revisao:

1. `supabase/migrations/202609160001_add_booking_type_demand_requester_archive.sql`
2. `app/api/bookings/route.ts`
3. `app/api/admin/bookings/create-manual/route.ts`
4. `app/api/admin/reports/export/route.ts`
5. `app/api/admin/reports/archive-week/route.ts`
6. `components/AdminBookingsPage.tsx`
7. `components/AdminReportForm.tsx`
8. `lib/bookingOperations.ts`
9. `lib/adminReports.ts`
10. `types/index.ts`
11. `tests/database-fixture.mjs`
12. `tests/booking-operations.test.ts`
13. `tests/preview-server.mjs`
14. `tests/admin-api-check.mjs`
15. `tests/surgical-review.test.ts` (novo)
16. `tests/concurrency-check.mjs` (novo)
17. `docs/EVOLUCAO_ADMIN_20260916.md`
18. `docs/REVISAO_CIRURGICA_20260916.md` (novo)

## Riscos e ativacao futura

1. Nao executar SQL em producao agora. A validacao foi local, com schema de fixture baseado na estrutura inspecionada. O adaptador REST local nao substitui PostgREST/Supabase real; homologar numa copia com constraints, policies, dados e configuracao equivalentes antes de liberar.
2. SQL e servidor novo dependem um do outro: a migration exige demanda explicita e o endpoint novo exige create_principal_booking. Nao aplicar SQL isoladamente com codigo antigo recebendo reservas; nao publicar codigo novo sem RPC. Planejar backup e janela coordenada de manutencao, suspender gravacoes durante a troca, testar e so entao reabrir. Nenhuma dessas acoes foi executada.
3. A garantia de concorrencia demonstrada cobre criacao principal versus avulsa em sessao existente. O endpoint legado de reagendamento faz leitura e update separados e nao participa desse lock; disputas envolvendo reagendamento ou gravacoes diretas no banco ainda precisam de revisao especifica. Nao foi modificado por restricao expressa de preservar suas regras. Tambem nao se garante capacidade contra criacao/edicao simultanea de sessoes pelo SQL Editor.
4. Grants legados amplos da view publica foram preservados intencionalmente. Homologar comportamento invoker com ACL/RLS reais. Reducao de privilegios legados deve ser uma revisao de seguranca propria, sem abrir tabelas privadas para manter acesso direto desnecessario.
5. Riscos anteriores, fora destes seis pontos: `/api/update-status` usa cliente privilegiado sem verificar sessao no handler; auditoria anterior de dependencias apontou vulnerabilidades, inclusive criticas no Next instalado. Exigem tratamento separado antes de exposicao segura, nao foram corrigidos silenciosamente.
6. Emails reais nao foram testados nem enviados. XLSX em memoria e comprovante assinado devem ser homologados com o volume real da semana e limites de payload/tempo da Vercel. Contas externas novas precisam de mapeamento de unidade, pois criacao avulsa retorna 403 por seguranca.
7. Desempenho e concorrencia em volume de producao nao foram medidos. As verificacoes demonstram integridade nos cenarios descritos, nao autorizam deploy automatico.
