// Collection of song lists that can be used with the Song Sorter

// SongList class to handle song lists with proper getter/setter methods
class SongList {
  constructor(id, name, songs, theme) {
    this._id = id;
    this._name = name;
    this._songs = [...songs]; // Create a copy to avoid direct reference
    this._theme = theme; // Store theme reference directly
    this._songCount = songs.length; // Pre-calculate song count
  }
  
  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get songs() { return [...this._songs]; } // Return a copy to prevent direct modification
  get theme() { return this._theme; }
  get songCount() { return this._songCount; }
}

// Repository for all song lists
class SongListRepository {
  constructor() {
    this._lists = Object.create(null); // Use null prototype for pure object map
    this._listCache = null; // Cache for getAllLists()
    this._idArray = []; // Keep track of IDs for faster iteration
  }
  
  // Add a song list to the repository
  addList(songList) {
    if (!(songList instanceof SongList)) {
      throw new Error('Must be a SongList instance');
    }
    
    this._lists[songList.id] = songList;
    this._idArray.push(songList.id);
    this._listCache = null; // Invalidate cache
  }
  
  // Get a song list by ID
  getList(id) {
    return this._lists[id] || null;
  }
  
  // Get all available song lists - now with caching
  getAllLists() {
    if (this._listCache) {
      return this._listCache;
    }
    
    const lists = this._idArray.map(id => ({
      id: id,
      name: this._lists[id].name
    }));
    
    this._listCache = lists;
    return lists;
  }
}

const THEMES = {
  bloodless: {
    backgroundColor: "#282828", // Dark gray
    textColor: "#e9e9e9", // Light gray
    buttonColor: "#686868", // Medium gray
    buttonHoverColor: "#555555", // Darker gray
    buttonTextColor: "#e9e9e9" // Light gray
  },
  honey: {
    backgroundColor: "#095a8a", // Light blue
    textColor: "#b1d3f1", // Light blue
    buttonColor: "#94c1e8", // Medium blue
    buttonHoverColor: "#6ba4d6", // Slightly darker blue
    buttonTextColor: "#2c4c6b" // Dark blue
  },
  theBaby: {
    backgroundColor: "#567c7e", // Teal
    textColor: "#8ac7ca", // Light teal
    buttonColor: "#2c4545", // Dark teal
    buttonHoverColor: "#122227", // Very dark teal
    buttonTextColor: "#8ac7ca" // Light teal
  },
  discography: {
    backgroundColor: "#ef936d",
    textColor: "#212121",
    buttonColor: "#c97c5c",
    buttonHoverColor: "#955c44",
    buttonTextColor: "#212121"
  }
};

const SONG_COLLECTIONS = {
  preBaby: Object.freeze([
    "Welcome to Eden",
    "The Night Josh Tillman Listened To My Song",
    "Someone Tell the Boys",
    "Django",
    "21",
    "Milk",
    "Lasting Friend",
    "Paris",
    "Ode to Artifice",
    "Never Said",
    "Gotta Have You"
  ]),
  
  theBaby: Object.freeze([
    "Pool",
    "Fit N Full",
    "Big Wheel",
    "Limbo Bitch",
    "Stellate",
    "Triptych",
    "Does Not Heal",
    "Waverly",
    "Winnebago",
    "Minnesota",
    "Is There Something In The Movies?"
  ]),
  
  scout: Object.freeze([
    "As You Are",
    "Show Up",
    "Elephant",
    "The Promise"
  ]),
  
  honey: Object.freeze([
    "Kill Her Freak Out",
    "Charm You",
    "Pink Balloon",
    "Mad at Me",
    "Sea Lions",
    "To Me It Was",
    "Breathing Song",
    "Honey",
    "Nanana",
    "Amelia",
    "Dream Song"
  ]),
  
  bloodless: Object.freeze([
    "Biscuits Intro",
    "Bovine Excision",
    "Hole in a Frame",
    "Lizard",
    "Dare",
    "Fair Game",
    "Spine Oil",
    "Craziest Person",
    "Sacred",
    "Carousel",
    "Proof",
    "North Poles",
    "Pants"
  ]),

  nonAlbumSingles: [
    "Desperado",
    "Born on a Train",
    "Maps",
    "Country",
    "Making Breakfast"
  ]
};

const discographyList = [
  ...SONG_COLLECTIONS.preBaby,
  ...SONG_COLLECTIONS.theBaby,
  ...SONG_COLLECTIONS.scout,
  "Desperado", "Born on a Train",
  ...SONG_COLLECTIONS.honey,
  "Maps", "Country", "Making Breakfast",
  ...SONG_COLLECTIONS.bloodless
];

// Initialize the repository with song lists
function initializeSongLists() {
  const songListRepo = new SongListRepository();
  
  // Create and add SongList instances all at once
  [
    new SongList("bloodless", "Bloodless", SONG_COLLECTIONS.bloodless, THEMES.bloodless),
    new SongList("honey", "Honey", SONG_COLLECTIONS.honey, THEMES.honey),
    new SongList("theBaby", "The Baby", SONG_COLLECTIONS.theBaby, THEMES.theBaby),
    new SongList("discography", "Full Discography", discographyList, THEMES.discography)
  ].forEach(list => songListRepo.addList(list));
  
  return songListRepo;
}

// Initialize the repository when the script loads
const songListRepo = initializeSongLists();