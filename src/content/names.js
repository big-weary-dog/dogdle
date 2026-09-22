// Dog names. Flat pick, no weighting -- a legendary breed is as likely to be called Gary
// as Marlowe, which is most of the joke.
//
// Three registers, deliberately mixed: names a dog would actually have, food, and the
// name of a man who does your taxes.
//
// Sorted on export, like the traits and the scenes: a name is picked by index, so without
// this the order they happen to sit in below decides which dog is called what, and adding
// one in the middle re-deals every future name. Grouped here for reading, not for the
// generator.

const POOL = [
  "Bailey", "Maple", "Kevin", "Biscuit", "Pickle", "Waffles", "Moose", "Nugget",
  "Olive", "Bruno", "Daisy", "Tank", "Pepper", "Gus", "Luna", "Bean",
  "Rufus", "Mochi", "Cooper", "Noodle", "Winston", "Sadie", "Bagel", "Hazel",
  "Diesel", "Peanut", "Murphy", "Willow", "Otis", "Juniper", "Chico", "Banjo",
  "Roscoe", "Clementine", "Barkley", "Ziggy", "Poppy", "Duke", "Marbles", "Scout",
  "Gravy", "Tofu", "Archie", "Pumpkin", "Wanda", "Bandit", "Cheeto", "Sprout",
  "Doug", "Pretzel", "Ramona", "Chunk", "Sasha", "Meatball", "Frankie", "Butters",
  "Mortimer", "Zelda", "Beans", "Hank", "Pancake", "Greta", "Tater", "Jellybean",
  "Wendell", "Cinnamon", "Bosco", "Fig", "Rupert", "Marlowe", "Kiwi", "Turnip",
  "Gizmo", "Clover", "Sheldon", "Dumpling", "Enzo", "Birdie", "Chowder", "Mabel",
  "Todd", "Linda", "Gary", "Deborah", "Kyle", "Brenda", "Steve", "Carol",

  // proper dog names
  "Copper", "Juno", "Remy", "Nala", "Koda", "Ranger", "Sable", "Wren",
  "Rowan", "Bramble", "Thistle", "Sorrel", "Ash", "Pip", "Nell", "Bodie",
  "Tilly", "Rueben", "Sully", "Maisie", "Baxter", "Nixie", "Odin", "Fern",

  // food
  "Brisket", "Custard", "Gumbo", "Pierogi", "Churro", "Miso", "Nacho", "Pesto",
  "Crouton", "Muffin", "Grits", "Cornbread", "Marmalade", "Truffle", "Wasabi", "Ziti",
  "Rhubarb", "Sorbet", "Tahini", "Crumpet", "Dill", "Scallion",

  // a man who does your taxes
  "Janet", "Barry", "Cheryl", "Dennis", "Sandra", "Gerald", "Pauline", "Trevor",
  "Denise", "Roger", "Sheila", "Norman", "Lorraine", "Keith", "Yvonne", "Craig",
];

export const NAMES = [...POOL].sort((a, b) => a.localeCompare(b));
