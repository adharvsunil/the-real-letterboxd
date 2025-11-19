import express from "express";
import { Database, aql } from "arangojs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

// ----------------------
// Setup
// ----------------------
const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ----------------------
// Database
// ----------------------
const db = new Database({
  url: "https://57f7022a960c.arangodb.cloud:8529",
  databaseName: "watchme",
  auth: { username: "root", password: "C067fwW8SNHSnuiECa9C" },
});

const Movies = db.collection("Movies");
const Directors = db.collection("Directors");
const Genres = db.collection("Genres");
const DIRECTED = db.collection("DIRECTED");
const BELONGS_TO = db.collection("BELONGS_TO");

// ----------------------
// Utility
// ----------------------
function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ----------------------
// Seed database
// ----------------------
async function seedDatabase() {
  try {
    const Users = db.collection("Users");
    if (!(await Users.exists())) await Users.create();
    if (!(await Movies.exists())) await Movies.create();
    if (!(await Directors.exists())) await Directors.create();
    if (!(await Genres.exists())) await Genres.create();
    if (!(await DIRECTED.exists())) await DIRECTED.create({ type: 3 });
    if (!(await BELONGS_TO.exists())) await BELONGS_TO.create({ type: 3 });

    const movies = [
      { title: "Inception", director: "Christopher Nolan", genre: "Sci-Fi", poster: "https://a.ltrbxd.com/resized/sm/upload/sv/95/s9/4j/inception-0-2000-0-3000-crop.jpg?v=30d7224316" },
      { title: "The Dark Knight", director: "Christopher Nolan", genre: "Action", poster: "https://a.ltrbxd.com/resized/sm/upload/78/y5/zg/ej/oefdD26aey8GPdx7Rm45PNncJdU-0-2000-0-3000-crop.jpg?v=2d0ce4be25" },
      { title: "Tenet", director: "Christopher Nolan", genre: "Action", poster: "https://a.ltrbxd.com/resized/sm/upload/pq/9f/sr/vt/aCIFMriQh8rvhxpN1IWGgvH0Tlg-0-2000-0-3000-crop.jpg?v=f3165fe17f" },
      { title: "Oppenheimer", director: "Christopher Nolan", genre: "Drama", poster: "https://a.ltrbxd.com/resized/film-poster/7/8/4/3/2/8/784328-oppenheimer-0-2000-0-3000-crop.jpg?v=e3c6e7a32c" },
      { title: "Pulp Fiction", director: "Quentin Tarantino", genre: "Crime", poster: "https://a.ltrbxd.com/resized/film-poster/5/1/4/4/4/51444-pulp-fiction-0-2000-0-3000-crop.jpg?v=dee19a8077" },
      { title: "Django Unchained", director: "Quentin Tarantino", genre: "Western", poster: "https://a.ltrbxd.com/resized/film-poster/5/2/5/1/6/52516-django-unchained-0-2000-0-3000-crop.jpg?v=f02aed63a3" },
      { title: "Kill Bill Vol.1", director: "Quentin Tarantino", genre: "Action", poster: "https://a.ltrbxd.com/resized/sm/upload/sw/w2/ep/v4/9O50TVszkz0dcP5g6Ej33UhR7vw-0-2000-0-3000-crop.jpg?v=5a65f5202f" },
      { title: "Inglourious Basterds", director: "Quentin Tarantino", genre: "War", poster: "https://a.ltrbxd.com/resized/film-poster/4/1/3/5/2/41352-inglourious-basterds-0-2000-0-3000-crop.jpg?v=0c74c673e0" },
      { title: "The Matrix", director: "The Wachowskis", genre: "Sci-Fi", poster: "https://a.ltrbxd.com/resized/film-poster/5/1/5/1/8/51518-the-matrix-0-2000-0-3000-crop.jpg?v=fc7c366afe" },
      { title: "Gladiator", director: "Ridley Scott", genre: "Action", poster: "https://a.ltrbxd.com/resized/film-poster/5/1/9/5/2/51952-gladiator-2000-0-2000-0-3000-crop.jpg?v=0071a74571" }
    ];

    for (const movie of movies) {
      const director = await db.query(aql`
        UPSERT { name: ${movie.director} }
        INSERT { _key: ${slug(movie.director)}, name: ${movie.director} }
        UPDATE {}
        IN Directors
        RETURN NEW
      `).then(c => c.next());

      const genre = await db.query(aql`
        UPSERT { name: ${movie.genre} }
        INSERT { _key: ${slug(movie.genre)}, name: ${movie.genre} }
        UPDATE {}
        IN Genres
        RETURN NEW
      `).then(c => c.next());

      const m = await db.query(aql`
        UPSERT { title: ${movie.title} }
        INSERT { 
          _key: ${slug(movie.title)},
          title: ${movie.title},
          poster: ${movie.poster},
          director: ${movie.director},
          genre: ${movie.genre}
        }
        UPDATE {}
        IN Movies
        RETURN NEW
      `).then(c => c.next());

      await db.query(aql`
        UPSERT { _from: ${director._id}, _to: ${m._id} }
        INSERT { _from: ${director._id}, _to: ${m._id} }
        UPDATE {}
        IN DIRECTED
      `);

      await db.query(aql`
        UPSERT { _from: ${m._id}, _to: ${genre._id} }
        INSERT { _from: ${m._id}, _to: ${genre._id} }
        UPDATE {}
        IN BELONGS_TO
      `);
    }

    console.log("✅ Database seeded successfully!");
  } catch (err) {
    console.error("Error seeding:", err);
  }
}

// ----------------------
// API Routes
// ----------------------

// REGISTER
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing fields" });

    const existing = await db.query(aql`FOR u IN Users FILTER u.username == ${username} RETURN u`).then(c => c.next());
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hash = await bcrypt.hash(password, 10);
    const newUser = await db.query(aql`
      INSERT { _key: ${username.toLowerCase()}, username: ${username}, password: ${hash}, wishlist: [] }
      INTO Users
      RETURN NEW
    `).then(c => c.next());

    res.json({ username: newUser.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.query(aql`FOR u IN Users FILTER u.username == ${username} RETURN u`).then(c => c.next());
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    res.json({ username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL MOVIES
app.get("/movies", async (req, res) => {
  try {
    const all = await db.query(aql`FOR m IN Movies RETURN m`).then(c => c.all());
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET RELATED MOVIES
app.get("/related/:key", async (req, res) => {
  try {
    const movieKey = req.params.key;

    const result = await db.query(aql`
      WITH Movies, Directors, Genres

      LET mainMovie = DOCUMENT(CONCAT("Movies/", ${movieKey}))

      LET directorMovies = (
        FOR d IN INBOUND mainMovie DIRECTED
          FOR m IN OUTBOUND d DIRECTED
            FILTER m._key != ${movieKey}
            RETURN DISTINCT m
      )

      LET genreMovies = (
        FOR g IN OUTBOUND mainMovie BELONGS_TO
          FOR m IN INBOUND g BELONGS_TO
            FILTER m._key != ${movieKey}
            RETURN DISTINCT m
      )

      RETURN {
        main: mainMovie,
        byDirector: directorMovies,
        byGenre: genreMovies
      }
    `).then(c => c.next());

    res.json(result);
  } catch (err) {
    console.error("🔥 AQL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// ----------------------
// Wishlist
// ----------------------

// GET Wishlist
app.get("/wishlist/:username", async (req, res) => {
  try {
    const user = await db.collection("Users").document(req.params.username.toLowerCase());
    const movies = await db.query(aql`
      FOR m IN Movies
        FILTER m._key IN ${user.wishlist}
        RETURN m
    `).then(c => c.all());
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Wishlist toggle
app.post("/wishlist/:username", async (req, res) => {
  try {
    const { movieKey } = req.body;
    const user = await db.collection("Users").document(req.params.username.toLowerCase());

    let wishlist = user.wishlist || [];
    if (wishlist.includes(movieKey)) wishlist = wishlist.filter(k => k !== movieKey);
    else wishlist.push(movieKey);

    await db.collection("Users").update(user._key, { wishlist });

    res.json({ wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ----------------------
// Start server
// ----------------------
app.listen(3000, async () => {
  console.log("🚀 Server running: http://localhost:3000");
  await seedDatabase();
});
