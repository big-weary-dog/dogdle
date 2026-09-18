// Every breed here maps to a Dog CEO API slug (https://dog.ceo/dog-api/), so each one
// has real photos available at /api/breed/<slug>/images/random.
//
// Rarity reflects real-world prevalence (roughly AKC registration popularity): the dogs
// you actually see at the park are common, enthusiast breeds are rare, and the genuinely
// hard-to-find ones are legendary.
//
// Slugs are verified against the live API by GET /api/verify-breeds on a deployed Worker.

export const BREEDS = [
  // ---------- common: the dogs you see every single day ----------
  { slug: "labrador", name: "Labrador Retriever", rarity: "common" },
  { slug: "retriever/golden", name: "Golden Retriever", rarity: "common" },
  { slug: "germanshepherd", name: "German Shepherd", rarity: "common" },
  { slug: "bulldog/french", name: "French Bulldog", rarity: "common" },
  { slug: "poodle/standard", name: "Standard Poodle", rarity: "common" },
  { slug: "beagle", name: "Beagle", rarity: "common" },
  { slug: "dachshund", name: "Dachshund", rarity: "common" },
  { slug: "rottweiler", name: "Rottweiler", rarity: "common" },
  { slug: "pointer/german", name: "German Shorthaired Pointer", rarity: "common" },
  { slug: "terrier/yorkshire", name: "Yorkshire Terrier", rarity: "common" },
  { slug: "boxer", name: "Boxer", rarity: "common" },
  { slug: "chihuahua", name: "Chihuahua", rarity: "common" },
  { slug: "husky", name: "Siberian Husky", rarity: "common" },
  { slug: "pug", name: "Pug", rarity: "common" },
  { slug: "shihtzu", name: "Shih Tzu", rarity: "common" },
  { slug: "pomeranian", name: "Pomeranian", rarity: "common" },
  { slug: "bulldog/english", name: "English Bulldog", rarity: "common" },
  { slug: "bulldog/boston", name: "Boston Terrier", rarity: "common" },
  { slug: "collie/border", name: "Border Collie", rarity: "common" },
  { slug: "australian/shepherd", name: "Australian Shepherd", rarity: "common" },
  { slug: "spaniel/cocker", name: "Cocker Spaniel", rarity: "common" },
  { slug: "pembroke", name: "Pembroke Welsh Corgi", rarity: "common" },
  { slug: "mix", name: "Mutt (Certified Good Boy)", rarity: "common" },
  { slug: "poodle/miniature", name: "Miniature Poodle", rarity: "common" },
  { slug: "doberman", name: "Doberman Pinscher", rarity: "common" },

  // ---------- uncommon: familiar, but you notice them ----------
  { slug: "shiba", name: "Shiba Inu", rarity: "uncommon" },
  { slug: "hound/basset", name: "Basset Hound", rarity: "uncommon" },
  { slug: "mountain/bernese", name: "Bernese Mountain Dog", rarity: "uncommon" },
  { slug: "greyhound/italian", name: "Italian Greyhound", rarity: "uncommon" },
  { slug: "weimaraner", name: "Weimaraner", rarity: "uncommon" },
  { slug: "vizsla", name: "Vizsla", rarity: "uncommon" },
  { slug: "dane/great", name: "Great Dane", rarity: "uncommon" },
  { slug: "maltese", name: "Maltese", rarity: "uncommon" },
  { slug: "havanese", name: "Havanese", rarity: "uncommon" },
  { slug: "akita", name: "Akita", rarity: "uncommon" },
  { slug: "malamute", name: "Alaskan Malamute", rarity: "uncommon" },
  { slug: "newfoundland", name: "Newfoundland", rarity: "uncommon" },
  { slug: "stbernard", name: "Saint Bernard", rarity: "uncommon" },
  { slug: "terrier/westhighland", name: "West Highland White Terrier", rarity: "uncommon" },
  { slug: "terrier/scottish", name: "Scottish Terrier", rarity: "uncommon" },
  { slug: "terrier/border", name: "Border Terrier", rarity: "uncommon" },
  { slug: "terrier/russell", name: "Jack Russell Terrier", rarity: "uncommon" },
  { slug: "schnauzer/miniature", name: "Miniature Schnauzer", rarity: "uncommon" },
  { slug: "setter/irish", name: "Irish Setter", rarity: "uncommon" },
  { slug: "springer/english", name: "English Springer Spaniel", rarity: "uncommon" },
  { slug: "sheepdog/shetland", name: "Shetland Sheepdog", rarity: "uncommon" },
  { slug: "whippet", name: "Whippet", rarity: "uncommon" },
  { slug: "ridgeback/rhodesian", name: "Rhodesian Ridgeback", rarity: "uncommon" },
  { slug: "cattledog/australian", name: "Australian Cattle Dog", rarity: "uncommon" },
  { slug: "pitbull", name: "Pit Bull Terrier", rarity: "uncommon" },
  { slug: "retriever/chesapeake", name: "Chesapeake Bay Retriever", rarity: "uncommon" },
  { slug: "mastiff/english", name: "English Mastiff", rarity: "uncommon" },
  { slug: "mastiff/bull", name: "Bullmastiff", rarity: "uncommon" },
  { slug: "papillon", name: "Papillon", rarity: "uncommon" },
  { slug: "pyrenees", name: "Great Pyrenees", rarity: "uncommon" },
  { slug: "frise/bichon", name: "Bichon Frise", rarity: "uncommon" },
  { slug: "labradoodle", name: "Labradoodle", rarity: "uncommon" },
  { slug: "poodle/toy", name: "Toy Poodle", rarity: "uncommon" },
  { slug: "chow", name: "Chow Chow", rarity: "uncommon" },
  { slug: "dalmatian", name: "Dalmatian", rarity: "uncommon" },
  { slug: "lhasa", name: "Lhasa Apso", rarity: "uncommon" },
  { slug: "pekinese", name: "Pekingese", rarity: "uncommon" },

  // ---------- rare: enthusiast breeds, a head-turner at the park ----------
  { slug: "samoyed", name: "Samoyed", rarity: "rare" },
  { slug: "hound/afghan", name: "Afghan Hound", rarity: "rare" },
  { slug: "hound/blood", name: "Bloodhound", rarity: "rare" },
  { slug: "wolfhound/irish", name: "Irish Wolfhound", rarity: "rare" },
  { slug: "deerhound/scottish", name: "Scottish Deerhound", rarity: "rare" },
  { slug: "borzoi", name: "Borzoi", rarity: "rare" },
  { slug: "saluki", name: "Saluki", rarity: "rare" },
  { slug: "basenji", name: "Basenji", rarity: "rare" },
  { slug: "keeshond", name: "Keeshond", rarity: "rare" },
  { slug: "leonberg", name: "Leonberger", rarity: "rare" },
  { slug: "elkhound/norwegian", name: "Norwegian Elkhound", rarity: "rare" },
  { slug: "schipperke", name: "Schipperke", rarity: "rare" },
  { slug: "brabancon", name: "Brussels Griffon", rarity: "rare" },
  { slug: "terrier/airedale", name: "Airedale Terrier", rarity: "rare" },
  { slug: "terrier/bedlington", name: "Bedlington Terrier", rarity: "rare" },
  { slug: "terrier/kerryblue", name: "Kerry Blue Terrier", rarity: "rare" },
  { slug: "terrier/cairn", name: "Cairn Terrier", rarity: "rare" },
  { slug: "terrier/norwich", name: "Norwich Terrier", rarity: "rare" },
  { slug: "terrier/wheaten", name: "Soft Coated Wheaten Terrier", rarity: "rare" },
  { slug: "terrier/tibetan", name: "Tibetan Terrier", rarity: "rare" },
  { slug: "spaniel/brittany", name: "Brittany Spaniel", rarity: "rare" },
  { slug: "spaniel/irish", name: "Irish Water Spaniel", rarity: "rare" },
  { slug: "spaniel/japanese", name: "Japanese Chin", rarity: "rare" },
  { slug: "setter/gordon", name: "Gordon Setter", rarity: "rare" },
  { slug: "schnauzer/giant", name: "Giant Schnauzer", rarity: "rare" },
  { slug: "retriever/flatcoated", name: "Flat-Coated Retriever", rarity: "rare" },
  { slug: "retriever/curly", name: "Curly-Coated Retriever", rarity: "rare" },
  { slug: "mountain/swiss", name: "Greater Swiss Mountain Dog", rarity: "rare" },
  { slug: "corgi/cardigan", name: "Cardigan Welsh Corgi", rarity: "rare" },
  { slug: "malinois", name: "Belgian Malinois", rarity: "rare" },
  { slug: "groenendael", name: "Belgian Groenendael", rarity: "rare" },
  { slug: "tervuren", name: "Belgian Tervuren", rarity: "rare" },
  { slug: "kelpie", name: "Australian Kelpie", rarity: "rare" },
  { slug: "coonhound", name: "Coonhound", rarity: "rare" },
  { slug: "redbone", name: "Redbone Coonhound", rarity: "rare" },
  { slug: "bluetick", name: "Bluetick Coonhound", rarity: "rare" },
  { slug: "eskimo", name: "American Eskimo Dog", rarity: "rare" },
  { slug: "pinscher/miniature", name: "Miniature Pinscher", rarity: "rare" },
  { slug: "cotondetulear", name: "Coton de Tulear", rarity: "rare" },
  { slug: "sheepdog/english", name: "Old English Sheepdog", rarity: "rare" },

  // ---------- epic: you'd stop someone on the street to ask ----------
  { slug: "mastiff/tibetan", name: "Tibetan Mastiff", rarity: "epic" },
  { slug: "komondor", name: "Komondor", rarity: "epic" },
  { slug: "kuvasz", name: "Kuvasz", rarity: "epic" },
  { slug: "briard", name: "Briard", rarity: "epic" },
  { slug: "bouvier", name: "Bouvier des Flandres", rarity: "epic" },
  { slug: "entlebucher", name: "Entlebucher Mountain Dog", rarity: "epic" },
  { slug: "appenzeller", name: "Appenzeller Sennenhund", rarity: "epic" },
  { slug: "clumber", name: "Clumber Spaniel", rarity: "epic" },
  { slug: "spaniel/sussex", name: "Sussex Spaniel", rarity: "epic" },
  { slug: "hound/ibizan", name: "Ibizan Hound", rarity: "epic" },
  { slug: "hound/plott", name: "Plott Hound", rarity: "epic" },
  { slug: "buhund/norwegian", name: "Norwegian Buhund", rarity: "epic" },
  { slug: "finnish/lapphund", name: "Finnish Lapphund", rarity: "epic" },
  { slug: "waterdog/spanish", name: "Spanish Water Dog", rarity: "epic" },
  { slug: "segugio/italian", name: "Italian Segugio", rarity: "epic" },
  { slug: "terrier/dandie", name: "Dandie Dinmont Terrier", rarity: "epic" },
  { slug: "terrier/sealyham", name: "Sealyham Terrier", rarity: "epic" },
  { slug: "terrier/patterdale", name: "Patterdale Terrier", rarity: "epic" },
  { slug: "spitz/japanese", name: "Japanese Spitz", rarity: "epic" },
  { slug: "spitz/indian", name: "Indian Spitz", rarity: "epic" },
  { slug: "sheepdog/indian", name: "Indian Sheepdog", rarity: "epic" },
  { slug: "africanis", name: "Africanis", rarity: "epic" },

  // ---------- legendary: genuinely hard to find in the wild ----------
  { slug: "otterhound", name: "Otterhound", rarity: "legendary" },
  { slug: "mexicanhairless", name: "Xoloitzcuintli", rarity: "legendary" },
  { slug: "ovcharka/caucasian", name: "Caucasian Shepherd", rarity: "legendary" },
  { slug: "dhole", name: "Dhole", rarity: "legendary" },
  { slug: "dingo", name: "Dingo", rarity: "legendary" },
  { slug: "puggle", name: "Puggle", rarity: "legendary" },
  { slug: "cockapoo", name: "Cockapoo", rarity: "legendary" },
];

export const RARITIES = {
  common: { label: "Common", weight: 50, color: "#9ca3af", glow: "0 0 12px rgba(156,163,175,.55)" },
  uncommon: { label: "Uncommon", weight: 27, color: "#34d399", glow: "0 0 18px rgba(52,211,153,.65)" },
  rare: { label: "Rare", weight: 14, color: "#38bdf8", glow: "0 0 22px rgba(56,189,248,.75)" },
  epic: { label: "Epic", weight: 7, color: "#a78bfa", glow: "0 0 28px rgba(167,139,250,.85)" },
  legendary: { label: "Legendary", weight: 2, color: "#fbbf24", glow: "0 0 36px rgba(251,191,36,1)" },
};

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

export function breedsByRarity(rarity) {
  return BREEDS.filter((b) => b.rarity === rarity);
}

export function photoEndpoint(slug) {
  return `https://dog.ceo/api/breed/${slug}/images/random`;
}
