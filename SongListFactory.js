import ARTIST_DATA from './artist_data.json' with {type: "json"};

class SongList {
  constructor(id, artist, name, songs, theme) {
    this._id = id;
    this._artist = artist;
    this._name = name;
    this._songs = [...songs]; // Create a copy to avoid direct reference
    this._theme = theme; // Store theme references directly
    this._songCount = songs.length; // Pre-calculate song count
  }

  // Getters
  get id() {
    return this._id;
  }

  get artist() {
    return this._artist;
  }

  get name() {
    return this._name;
  }

  get songs() {
    return [...this._songs];
  }

  get theme() {
    return this._theme;
  }

  get songCount() {
    return this._songCount;
  }
}

class SongListRepository {
  constructor() {
    this._lists = new Map();
    this._listCache = null;
    this._artistCache = null;
  }

  addList(songList) {
    if (!(songList instanceof SongList)) {
      throw new Error('Must be a SongList instance');
    }

    this._lists.set(songList.id, songList);
    this._listCache = null;
    this._artistCache = null;
  }

  getList(id) {
    return this._lists.get(id) || null;
  }

  getListsByArtist(artist) {
    return Array.from(this._lists.values())
      .filter(list => list.artist === artist)
      .map(list => ({id: list.id, name: list.name}));
  }

  getAllLists() {
    if (this._listCache) {
      return this._listCache;
    }

    this._listCache = Array.from(this._lists.entries()).map(([id, list]) => ({
      id, name: list.name
    }));

    return this._listCache;
  }

  getAllArtists() {
    if (this._artistCache) {
      return this._artistCache;
    }

    this._artistCache = [...new Set(Array.from(this._lists.values()).map(list => list.artist))];
    return this._artistCache;
  }
}

// Generic method to add any artist from ARTIST_DATA
function addArtistToRepo(repository, artistKey, config = {}) {
  const artistData = ARTIST_DATA[artistKey];
  if (!artistData) {
    throw new Error(`Artist "${artistKey}" not found in ARTIST_DATA`);
  }

  const {
    displayName = null,
    includeAlbums = null, // Array of album keys to include, or null for all
    excludeAlbums = [], // Array of album keys to exclude
    discography = null, // Discography configuration
    themeMapping = {}, // Map album keys to different theme keys
    fallbackTheme = null // Theme object to use if artist has no themes
  } = config;

  const artist = displayName || formatArtistName(artistKey);
  const songs = artistData.songs;
  const themes = artistData.themes || {};

  // Determine default theme
  let defaultTheme;
  if (fallbackTheme) {
    defaultTheme = fallbackTheme;
  } else if (Object.keys(themes).length > 0) {
    defaultTheme = themes[Object.keys(themes)[0]];
  } else {
    // Ultimate fallback - a neutral theme
    defaultTheme = {
      backgroundColor: "#1a1a1a",
      textColor: "#e0e0e0",
      buttonColor: "#4a4a4a",
      buttonHoverColor: "#2a2a2a",
      buttonTextColor: "#e0e0e0"
    };
  }

  // Determine which albums to include
  let albumsToInclude = Object.keys(songs);

  if (includeAlbums) {
    albumsToInclude = includeAlbums;
  }

  albumsToInclude = albumsToInclude.filter(albumKey => !excludeAlbums.includes(albumKey)).reverse();

  // Create individual album/collection lists
  albumsToInclude.forEach(albumKey => {
    const albumSongs = songs[albumKey];
    if (Array.isArray(albumSongs) && albumSongs.length > 0) {
      // Use theme mapping if provided, otherwise use album key
      const themeKey = themeMapping[albumKey] || albumKey;
      const theme = themes[themeKey] || defaultTheme;
      const albumName = formatAlbumName(albumKey);

      repository.addList(
        new SongList(albumKey, artist, albumName, albumSongs, theme)
      );
    }
  });

  // Create discography list if configuration is provided
  if (discography) {
    const { songs: discographySongs, theme: discographyTheme } = discography;
    repository.addList(
      new SongList(
        `${artistKey}_discography`,
        artist,
        `${artist} Discography`,
        discographySongs,
        discographyTheme
      )
    );
  }
}

// Helper function to format artist names
function formatArtistName(artistKey) {
  // Convert snake_case to Title Case
  return artistKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper function to format album names
function formatAlbumName(albumKey) {
  const albumMap = {
    'preBaby': 'Pre-Baby',
    'debut': 'Debut (Taylor Swift)',
    'album1989': '1989',
    'ttpd': 'The Tortured Poets Department',
    'showgirl': 'The Life of a Showgirl',
    'emails': 'emails i can\'t send',
    'sns': 'Short n\' Sweet',
    'mans_best_friend': "Man's Best Friend",
    'nonAlbumSingles': 'Non-Album Singles',
    'altVersions': 'Alternative Versions',
    'covers': 'Covers',
    'features': 'Features',
    'soundtrack': 'Soundtrack',
  };
  return albumMap[albumKey] || albumKey
    .replace(/_/g, ' ')  // Replace underscores with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space before capitals only when preceded by lowercase
    .trim()  // Remove leading/trailing spaces
    .replace(/\b\w/g, l => l.toUpperCase());  // Capitalize first letter of each word
}

function initializeSongLists() {
  const repo = new SongListRepository();

  // Samia - exclude preBaby, include specific albums
  const samia = ARTIST_DATA.samia;
  const samiaDiscography = [
    ...samia.songs.preBaby,
    ...samia.songs.the_baby,
    ...samia.songs.scout,
    "Desperado", "Born on a Train",
    ...samia.songs.honey,
    "Maps", "Country", "Making Breakfast",
    ...samia.songs.bloodless,
    "Pool - Stripped",
    "Cinder Block"
  ];
  addArtistToRepo(repo, 'samia', {
    excludeAlbums: ['preBaby', 'nonAlbumSingles', 'scout'], // Don't create individual lists for these
    discography: {
      songs: samiaDiscography,
      theme: samia.themes.bloodless_live
    }
  });

  // Taylor Swift - exclude covers, features, soundtracks, altVersions, nonAlbumSingles
  const taylor = ARTIST_DATA.taylor_swift;
  const taylorDiscography = [
    ...taylor.songs.debut,
    ...taylor.songs.fearless,
    "Crazier",
    ...taylor.songs.speakNow,
    "Safe & Sound",
    "Eyes Open",
    ...taylor.songs.red,
    "Sweeter Than Fiction",
    ...taylor.songs.album1989,
    ...taylor.songs.reputation,
    ...taylor.songs.lover,
    "All Of The Girls You Loved Before",
    "Christmas Tree Farm",
    "Macavity",
    "Beautiful Ghosts",
    "Only The Young",
    ...taylor.songs.folklore,
    ...taylor.songs.evermore,
    "Carolina",
    ...taylor.songs.midnights,
    ...taylor.songs.ttpd,
    ...taylor.songs.showgirl
  ];
  addArtistToRepo(repo, 'taylor_swift', {
    excludeAlbums: ['covers', 'features', 'soundtrack', 'altVersions', 'nonAlbumSingles'],
    themeMapping: {
      'album1989': 'album1989_tv',
      'red': 'red_tv',
      'speakNow': 'speakNow_tv',
      'fearless': 'fearless_tv'
    },
    discography: {
      songs: taylorDiscography,
      theme: taylor.themes.red
    }
  });

  addArtistToRepo(repo, 'BTS');

  const conanGray = ARTIST_DATA.conan_gray;
  const conanDiscography = [
    "Grow",
    ...conanGray.songs.sunset_season,
    "The Other Side",
    "The King",
    ...conanGray.songs.kid_krow,
    "Overdrive",
    "Telepath",
    ...conanGray.songs.superache,
    ...conanGray.songs.found_heaven,
    "Holidays",
    ...conanGray.songs.wishbone
  ];
  addArtistToRepo(repo, 'conan_gray', {
    discography: {
      songs: conanDiscography,
      theme: conanGray.themes.overdrive
    }
  });

  addArtistToRepo(repo, 'lorde');
  addArtistToRepo(repo, 'olivia_rodrigo');
  addArtistToRepo(repo, 'sabrina_carpenter');
  addArtistToRepo(repo, 'blue_october');

  //addArtistToRepo(repo, 'other', { fallbackTheme: samia.themes.bloodless });

  return repo;
}

// Initialize the repository when the script loads
export const songListRepo = initializeSongLists();