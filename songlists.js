// Collection of song lists that can be used with the Song Sorter
const songLists = {
  "bloodless": {
    name: "Bloodless",
    songs: [
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
    ],
    theme: {
      backgroundColor: "#282828", // Dark gray
      textColor: "#e9e9e9", // Light gray
      buttonColor: "#686868", // Medium gray
      buttonHoverColor: "#555555", // Darker gray
      buttonTextColor: "#e9e9e9" // Light gray
    }
  },
  
  "honey": {
    name: "Honey",
    songs: [
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
    ],
    theme: {
      backgroundColor: "#095a8a", // Light blue
      textColor: "#b1d3f1", // Light blue
      buttonColor: "#94c1e8", // Medium blue
      buttonHoverColor: "#6ba4d6", // Slightly darker blue
      buttonTextColor: "#2c4c6b" // Dark blue
    }
  },
  
  "theBaby": {
    name: "The Baby",
    songs: [
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
    ],
    theme: {
      backgroundColor: "#567c7e", // Teal
      textColor: "#8ac7ca", // Light teal
      buttonColor: "#2c4545", // Dark teal
      buttonHoverColor: "#122227", // Very dark teal
      buttonTextColor: "#8ac7ca" // Light teal
    }
  },

  "discography": {
    name: "Full Discography",
    songs: [
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
      "Gotta Have You",
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
      "Is There Something In The Movies?",
      "As You Are",
      "Show Up",
      "Elephant",
      "The Promise",
      "Desperado",
      "Born on a Train",
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
      "Dream Song",
      "Maps",
      "Country",
      "Making Breakfast",
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
    ],
    theme: {
      backgroundColor: "#fc9c74", // Teal
      textColor: "#212121", // Light teal
      buttonColor: "#c97c5c", // Dark teal
      buttonHoverColor: "#955c44", // Very dark teal
      buttonTextColor: "#212121" // Light teal
    }
  }
};

// Default selected list
let currentListId = "bloodless";

// Function to get the current list of songs
function getCurrentSongList() {
  return songLists[currentListId].songs;
}

// Function to get the current theme
function getCurrentTheme() {
  return songLists[currentListId].theme;
}

// Function to set the current list
function setCurrentSongList(listId) {
  if (songLists[listId]) {
    currentListId = listId;
    applyTheme(songLists[listId].theme);
    return true;
  }
  return false;
}

// Function to apply the theme to the page
function applyTheme(theme) {
  document.documentElement.style.setProperty('--background-color', theme.backgroundColor);
  document.documentElement.style.setProperty('--text-color', theme.textColor);
  document.documentElement.style.setProperty('--button-color', theme.buttonColor);
  document.documentElement.style.setProperty('--button-hover-color', theme.buttonHoverColor);
  document.documentElement.style.setProperty('--button-text-color', theme.buttonTextColor);
}

// Function to get all available list IDs and names
function getAvailableSongLists() {
  const lists = [];
  for (const [id, list] of Object.entries(songLists)) {
    lists.push({ id, name: list.name });
  }
  return lists;
}

// Function to add a new song list (for future expansion)
function addSongList(id, name, songs, theme) {
  if (!songLists[id]) {
    songLists[id] = {
      name,
      songs,
      theme
    };
    return true;
  }
  return false;
}