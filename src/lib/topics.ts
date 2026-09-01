import { Language, Topic } from "./types";

// Ordered by specificity — more specific/unambiguous topics first, since
// classifyTopic returns on the first topic with a matching keyword.
const TOPIC_ORDER: Topic[] = [
  "Videojuegos",
  "Salud",
  "Medio ambiente",
  "Educación",
  "Tecnología",
  "Ciencia",
  "Negocios",
  "Política",
  "Deportes",
  "Cultura",
];

// Plain lowercase keyword/phrase substrings per topic and language — not
// regex. Titles in Wikipedia's non-English editions are real text in that
// language, not a translation of English trends, so matching them needs
// each language's own vocabulary, not just English keywords. Substring
// matching (rather than \b-bounded regex) sidesteps the fact that JS's
// \b word-boundary is ASCII-only and misbehaves around accented letters
// (á, ñ, ü, ç...) that are common in es/fr/de/it/pt keywords.
//
// Known gap: German builds compounds ("Bundesregierung" = "Bundes" +
// "regierung"), so a bare "regierung" entry won't match inside it — the
// boundary check that protects against false positives elsewhere also
// blocks legitimate compound matches. Where that matters we list the
// compound explicitly (e.g. "bundesregierung") rather than trying to
// split compounds generically.
const TOPIC_KEYWORDS: Partial<Record<Topic, Partial<Record<Language, string[]>>>> = {
  Videojuegos: {
    en: ["video game", "videogame", "gaming", "xbox", "playstation", "ps5", "nintendo", "steam", "esports"],
    es: ["videojuego", "xbox", "playstation", "nintendo", "steam", "esports", "gaming"],
    fr: ["jeu vidéo", "jeux vidéo", "xbox", "playstation", "nintendo", "steam", "esport"],
    de: ["videospiel", "gaming", "xbox", "playstation", "nintendo", "steam", "esport"],
    it: ["videogioco", "videogiochi", "xbox", "playstation", "nintendo", "steam", "esport"],
    pt: ["videogame", "jogos eletrônicos", "xbox", "playstation", "nintendo", "steam", "esport"],
  },
  Salud: {
    en: ["health", "disease", "virus", "outbreak", "hospital", "surgery", "vaccine", "pandemic"],
    es: ["salud", "enfermedad", "virus", "brote", "hospital", "cirugía", "vacuna", "pandemia"],
    fr: ["santé", "maladie", "virus", "épidémie", "hôpital", "chirurgie", "vaccin", "pandémie"],
    de: ["gesundheit", "krankheit", "virus", "ausbruch", "krankenhaus", "operation", "impfstoff", "pandemie"],
    it: ["salute", "malattia", "virus", "epidemia", "ospedale", "chirurgia", "vaccino", "pandemia"],
    pt: ["saúde", "doença", "vírus", "surto", "hospital", "cirurgia", "vacina", "pandemia"],
  },
  "Medio ambiente": {
    en: ["climate change", "wildfire", "drought", "deforestation", "emissions", "renewable", "pollution", "extinction"],
    es: ["cambio climático", "incendio forestal", "sequía", "deforestación", "emisiones", "renovable", "contaminación", "extinción"],
    fr: ["changement climatique", "incendie de forêt", "sécheresse", "déforestation", "émissions", "renouvelable", "pollution", "extinction"],
    de: ["klimawandel", "klimapolitik", "klimaschutz", "klimakrise", "waldbrand", "dürre", "abholzung", "emissionen", "erneuerbar", "umweltverschmutzung", "aussterben"],
    it: ["cambiamento climatico", "incendio boschivo", "siccità", "deforestazione", "emissioni", "rinnovabile", "inquinamento", "estinzione"],
    pt: ["mudança climática", "incêndio florestal", "seca", "desmatamento", "emissões", "renovável", "poluição", "extinção"],
  },
  Educación: {
    en: ["university", "school", "student", "curriculum", "professor", "scholarship", "classroom"],
    es: ["universidad", "escuela", "estudiante", "currículo", "profesor", "beca", "aula"],
    fr: ["université", "école", "étudiant", "programme scolaire", "professeur", "bourse", "salle de classe"],
    de: ["universität", "schule", "student", "lehrplan", "professor", "stipendium", "klassenzimmer"],
    it: ["università", "scuola", "studente", "curriculum", "professore", "borsa di studio", "aula"],
    pt: ["universidade", "escola", "estudante", "currículo", "professor", "bolsa de estudos", "sala de aula"],
  },
  Tecnología: {
    en: ["ai", "llm", "gpt", "software", "startup", "programming", "open source", "github", "robot", "quantum", "cybersecurity", "hack", "data"],
    es: ["inteligencia artificial", "software", "aplicación", "startup", "programación", "código abierto", "robot", "ciberseguridad", "hackeo", "datos"],
    fr: ["intelligence artificielle", "logiciel", "application", "startup", "programmation", "open source", "robot", "cybersécurité", "piratage", "données"],
    de: ["künstliche intelligenz", "software", "anwendung", "startup", "programmierung", "open source", "roboter", "cybersicherheit", "hacking", "daten"],
    it: ["intelligenza artificiale", "software", "applicazione", "startup", "programmazione", "open source", "robot", "sicurezza informatica", "hacking", "dati"],
    pt: ["inteligência artificial", "software", "aplicativo", "startup", "programação", "código aberto", "robô", "segurança cibernética", "hacking", "dados"],
  },
  Ciencia: {
    en: ["nasa", "space", "physics", "biology", "research", "scientist", "astronomy", "genome", "cancer", "telescope", "species", "fossil"],
    es: ["ciencia", "física", "biología", "investigación", "científico", "astronomía", "genoma", "cáncer", "telescopio", "especie", "fósil"],
    fr: ["science", "physique", "biologie", "recherche", "scientifique", "astronomie", "génome", "cancer", "télescope", "espèce", "fossile"],
    de: ["wissenschaft", "physik", "biologie", "forschung", "wissenschaftler", "astronomie", "genom", "krebs", "teleskop", "fossil"],
    it: ["scienza", "fisica", "biologia", "ricerca", "scienziato", "astronomia", "genoma", "cancro", "telescopio", "specie", "fossile"],
    pt: ["ciência", "física", "biologia", "pesquisa", "cientista", "astronomia", "genoma", "câncer", "telescópio", "espécie", "fóssil"],
  },
  Negocios: {
    en: ["ipo", "acquisition", "funding", "market", "stock", "revenue", "ceo", "merger", "layoffs", "earnings", "economy", "inflation", "bank"],
    es: ["adquisición", "financiación", "mercado", "acciones", "ingresos", "director ejecutivo", "fusión", "despidos", "beneficios", "economía", "inflación", "banco"],
    fr: ["acquisition", "financement", "marché", "actions", "revenus", "pdg", "fusion", "licenciements", "bénéfices", "économie", "inflation", "banque"],
    de: ["übernahme", "finanzierung", "markt", "aktien", "umsatz", "geschäftsführer", "fusion", "entlassungen", "gewinn", "wirtschaft", "inflation", "bank"],
    it: ["acquisizione", "finanziamento", "mercato", "azioni", "ricavi", "amministratore delegato", "fusione", "licenziamenti", "utili", "economia", "inflazione", "banca"],
    pt: ["aquisição", "financiamento", "mercado", "ações", "receita", "ceo", "fusão", "demissões", "lucro", "economia", "inflação", "banco"],
  },
  Política: {
    en: ["election", "president", "congress", "senate", "government", "vote", "minister", "parliament", "war", "treaty", "sanctions"],
    es: ["elección", "elecciones", "presidente", "congreso", "senado", "gobierno", "voto", "ministro", "parlamento", "guerra", "tratado", "sanciones"],
    fr: ["élection", "président", "congrès", "sénat", "gouvernement", "vote", "ministre", "parlement", "guerre", "traité", "sanctions"],
    de: ["wahl", "präsident", "kongress", "senat", "regierung", "bundesregierung", "bundestag", "bundeskanzler", "abstimmung", "minister", "parlament", "krieg", "vertrag", "sanktionen"],
    it: ["elezione", "presidente", "congresso", "senato", "governo", "voto", "ministro", "parlamento", "guerra", "trattato", "sanzioni"],
    pt: ["eleição", "presidente", "congresso", "senado", "governo", "voto", "ministro", "parlamento", "guerra", "tratado", "sanções"],
  },
  Deportes: {
    en: ["football", "soccer", "nba", "olympics", "championship", "tournament", "league", "world cup", "athlete", "tennis", "formula 1"],
    es: ["fútbol", "baloncesto", "juegos olímpicos", "campeonato", "torneo", "liga", "copa del mundo", "atleta", "tenis", "fórmula 1"],
    fr: ["football", "basket-ball", "jeux olympiques", "championnat", "tournoi", "ligue", "coupe du monde", "athlète", "tennis", "formule 1"],
    de: ["fußball", "basketball", "olympische spiele", "meisterschaft", "turnier", "liga", "weltmeisterschaft", "athlet", "tennis", "formel 1"],
    it: ["calcio", "basket", "olimpiadi", "campionato", "torneo", "coppa del mondo", "atleta", "tennis", "formula 1"],
    pt: ["futebol", "basquete", "jogos olímpicos", "campeonato", "torneio", "copa do mundo", "atleta", "tênis", "fórmula 1"],
  },
  Cultura: {
    en: ["film", "movie", "music", "album", "book", "author", "celebrity", "series", "festival", "actor", "director"],
    es: ["película", "música", "álbum", "libro", "autor", "celebridad", "serie", "festival", "actor", "director"],
    fr: ["film", "musique", "album", "livre", "auteur", "célébrité", "série", "festival", "acteur", "réalisateur"],
    de: ["film", "musik", "album", "buch", "autor", "prominente", "serie", "festival", "schauspieler", "regisseur"],
    it: ["film", "musica", "album", "libro", "autore", "celebrità", "serie", "festival", "attore", "regista"],
    pt: ["filme", "música", "álbum", "livro", "autor", "celebridade", "série", "festival", "ator", "diretor"],
  },
};

const LETTER_OR_DIGIT = /\p{L}|\p{N}/u;

function isWordChar(ch: string): boolean {
  return ch !== "" && LETTER_OR_DIGIT.test(ch);
}

// Unicode-aware word-boundary check for a substring match. Plain
// `.includes()` would let short keywords like "ai" match inside unrelated
// words ("again", "rain"); JS's native `\b` regex boundary is ASCII-only
// and misbehaves around accented letters (á, ñ, ü, ç...) that are common
// in the non-English keyword lists below. Checking the actual character
// (via \p{L}) on each side handles both correctly.
function containsWord(haystack: string, needle: string): boolean {
  let fromIndex = 0;
  while (true) {
    const idx = haystack.indexOf(needle, fromIndex);
    if (idx === -1) return false;
    const before = idx > 0 ? haystack[idx - 1] : "";
    const after = idx + needle.length < haystack.length ? haystack[idx + needle.length] : "";
    if (!isWordChar(before) && !isWordChar(after)) return true;
    fromIndex = idx + 1;
  }
}

export function classifyTopic(title: string, lang: Language, fallback: Topic): Topic {
  const normalized = title.toLowerCase();
  for (const topic of TOPIC_ORDER) {
    const keywords = TOPIC_KEYWORDS[topic]?.[lang] ?? TOPIC_KEYWORDS[topic]?.en ?? [];
    if (keywords.some((keyword) => containsWord(normalized, keyword))) return topic;
  }
  return fallback;
}
