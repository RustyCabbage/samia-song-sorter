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
    ]
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
    ]
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
    ]
  }
};

// Default selected list
let currentListId = "bloodless";

// Function to get the current list of songs
function getCurrentSongList() {
  return songLists[currentListId].songs;
}

// Function to set the current list
function setCurrentSongList(listId) {
  if (songLists[listId]) {
    currentListId = listId;
    return true;
  }
  return false;
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
function addSongList(id, name, songs) {
  if (!songLists[id]) {
    songLists[id] = {
      name,
      songs
    };
    return true;
  }
  return false;
}