// Collection of song lists that can be used with the Song Sorter

// SongList class to handle song lists with proper getter/setter methods
class SongList {
  constructor(id, name, songs, theme) {
    this._id = id;
    this._name = name;
    this._songs = [...songs]; // Create a copy to avoid direct reference
    this._theme = { ...theme }; // Create a copy to avoid direct reference
  }
  
  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get songs() { return [...this._songs]; } // Return a copy to prevent direct modification
  get theme() { return { ...this._theme }; } // Return a copy to prevent direct modification
  get songCount() { return this._songs.length; }
  
  // Method to apply the theme to the page
  applyTheme() {
    document.documentElement.style.setProperty('--background-color', this._theme.backgroundColor);
    document.documentElement.style.setProperty('--text-color', this._theme.textColor);
    document.documentElement.style.setProperty('--button-color', this._theme.buttonColor);
    document.documentElement.style.setProperty('--button-hover-color', this._theme.buttonHoverColor);
    document.documentElement.style.setProperty('--button-text-color', this._theme.buttonTextColor);
  }

  // Method to apply the song count to the page
  applySongCount() {
    document.getElementById("songCount").textContent = `${this.songCount} songs`;
  }
}

// Repository for all song lists
class SongListRepository {
  constructor() {
    this._lists = {};
  }
  
  // Add a song list to the repository
  addList(songList) {
    if (!(songList instanceof SongList)) {
      throw new Error('Must be a SongList instance');
    }
    this._lists[songList.id] = songList;
  }
  
  // Get a song list by ID
  getList(id) {
    return this._lists[id] || null;
  }
  
  // Get all available song lists
  getAllLists() {
    const lists = [];
    for (const id in this._lists) {
      lists.push({
        id: id,
        name: this._lists[id].name
      });
    }
    return lists;
  }
}

// Song lists data
const bloodlessSongs = [
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
];

const honeySongs = [
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
];

const scoutSongs = [
  "As You Are",
  "Show Up",
  "Elephant",
  "The Promise",
];

const theBabySongs = [
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
];

const preBabySongs = [
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
];

// Initialize the repository with song lists
function initializeSongLists() {
  // Create SongList instances and add them to the repository
  songListRepo.addList(new SongList(
    "bloodless",
    "Bloodless",
    //[ "Song A", "Song B", "Song C" ], // testing
    bloodlessSongs,
    {
      backgroundColor: "#282828", // Dark gray
      textColor: "#e9e9e9", // Light gray
      buttonColor: "#686868", // Medium gray
      buttonHoverColor: "#555555", // Darker gray
      buttonTextColor: "#e9e9e9" // Light gray
    }
  ));
  
  songListRepo.addList(new SongList(
    "honey",
    "Honey",
    honeySongs,
    {
      backgroundColor: "#095a8a", // Light blue
      textColor: "#b1d3f1", // Light blue
      buttonColor: "#94c1e8", // Medium blue
      buttonHoverColor: "#6ba4d6", // Slightly darker blue
      buttonTextColor: "#2c4c6b" // Dark blue
    }
  ));
  
  songListRepo.addList(new SongList(
    "theBaby",
    "The Baby",
    theBabySongs,
    {
      backgroundColor: "#567c7e", // Teal
      textColor: "#8ac7ca", // Light teal
      buttonColor: "#2c4545", // Dark teal
      buttonHoverColor: "#122227", // Very dark teal
      buttonTextColor: "#8ac7ca" // Light teal
    }
  ));
  
  songListRepo.addList(new SongList(
    "discography",
    "Full Discography",
    [
      ...preBabySongs,
      ...theBabySongs,
      ...scoutSongs,
      "Desperado",
      "Born on a Train",
      ...honeySongs,
      "Maps",
      "Country",
      "Making Breakfast",
      ...bloodlessSongs
    ],
    {
      backgroundColor: "#ef936d",
      textColor: "#212121",
      buttonColor: "#c97c5c",
      buttonHoverColor: "#955c44",
      buttonTextColor: "#212121"
    }
  ));
}

// Create the repository instance
const songListRepo = new SongListRepository();
// Initialize the repository when the script loads
initializeSongLists();
