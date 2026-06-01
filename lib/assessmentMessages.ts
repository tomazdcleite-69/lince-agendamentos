import type { AssessmentModality } from "@/types";

export const presencialConfirmationParagraphs = [
  "Seu agendamento foi confirmado com sucesso. Segue informações importantes sobre a Avaliação Psicológica:",
  "A avaliação possui duração média de 2 horas, pois contempla a aplicação dos testes e a entrevista individual com cada candidato.",
  "Para um melhor desempenho durante o processo, orientamos que o candidato:",
];

export const presencialCandidateGuidelines = [
  "Esteja bem alimentado;",
  "Tenha uma boa noite de sono antes da avaliação;",
  "Caso utilize óculos, não esqueça de trazer.",
];

export const presencialAddressParagraphs = [
  "Endereço de comparecimento:",
  "Condomínio Baltimore Trade Center - Rua Fortunato Ramos, Santa Lúcia, n° 116, 5° andar - Santa Lucia, Vitória - ES, 29056-020 (nosso prédio é de cor preta, fica em frente a Nina Saúde, na rua da Multiscan).",
  "👉🏼 Para quem vem de ônibus da Serra, deve desembarcar na Reta da Penha, no ponto da pracinha, em frente à Multiscan. Caso venha de Vila Velha ou Cariacica, o desembarque deve ser feito na Reta da Penha, no ponto localizado em frente ao Shopping Centro da Praia.",
];

export const onlineConfirmationMessage =
  "Seu agendamento foi solicitado com sucesso. Em breve a equipe da Lince fará o contato para envio da avaliação ao candidato. Você receberá o Laudo em até 02 dias úteis após a realização.";

export function getCustomerConfirmationMessage(modality: AssessmentModality) {
  if (modality === "online") {
    return onlineConfirmationMessage;
  }

  return [
    ...presencialConfirmationParagraphs,
    ...presencialCandidateGuidelines.map((item) => `* ${item}`),
    ...presencialAddressParagraphs,
  ].join("\n\n");
}
