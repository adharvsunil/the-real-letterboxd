const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Movie data with description
const movies = [
  { title: "Inception", year: 2010, director: "Christopher Nolan", genre: "Sci-Fi", poster: "https://a.ltrbxd.com/resized/sm/upload/sv/95/s9/4j/inception-0-460-0-690-crop.jpg?v=30d7224316 2x", description: "A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O." },
  { title: "Interstellar", year: 2014, director: "Christopher Nolan", genre: "Sci-Fi", poster: "https://image.tmdb.org/t/p/w300/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival." },
  { title: "The Dark Knight", year: 2008, director: "Christopher Nolan", genre: "Action", poster: "https://image.tmdb.org/t/p/w300/qJ2tW6WMUDux911r6m7haRef0WH.jpg", description: "Batman raises the stakes in his war on crime when a criminal mastermind known as the Joker emerges." },
  { title: "Avatar", year: 2009, director: "James Cameron", genre: "Sci-Fi", poster: "https://image.tmdb.org/t/p/w300/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg", description: "A paraplegic Marine dispatched to the moon Pandora becomes torn between following his orders and protecting an alien civilization." },
  { title: "Titanic", year: 1997, director: "James Cameron", genre: "Romance", poster: "https://image.tmdb.org/t/p/w300/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg", description: "A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic." },
  { title: "Pulp Fiction", year: 1994, director: "Quentin Tarantino", genre: "Crime", poster: "https://image.tmdb.org/t/p/w300/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", description: "The lives of two mob hitmen, a boxer, a gangster's wife, and a pair of diner bandits intertwine in four tales of violence and redemption." },
  { title: "Django Unchained", year: 2012, director: "Quentin Tarantino", genre: "Western", poster: "https://image.tmdb.org/t/p/w300/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg", description: "With the help of a German bounty hunter, a freed slave sets out to rescue his wife from a brutal plantation owner." },
  { title: "The Matrix", year: 1999, director: "Lana Wachowski", genre: "Sci-Fi", poster: "https://image.tmdb.org/t/p/w300/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg", description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers." },
  { title: "John Wick", year: 2014, director: "Chad Stahelski", genre: "Action", poster: "https://image.tmdb.org/t/p/w300/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg", description: "An ex-hitman comes out of retirement to track down the gangsters that killed his dog and took everything from him." },
  { title: "Gladiator", year: 2000, director: "Ridley Scott", genre: "Action", poster: "https://image.tmdb.org/t/p/w300/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg", description: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery." }
];

// Search a movie by title
app.get('/search', (req, res) => {
  const title = req.query.title?.toLowerCase();
  const movie = movies.find(m => m.title.toLowerCase() === title);
  if (movie) res.json(movie);
  else res.status(404).json({ error: "Movie not found" });
});

// Related movies
app.get('/related/:title', (req, res) => {
  const title = req.params.title?.toLowerCase();
  const baseMovie = movies.find(m => m.title.toLowerCase() === title);
  if (!baseMovie) return res.status(404).json({ error: "Movie not found" });

  const byDirector = movies.filter(m => m.title.toLowerCase() !== title && m.director === baseMovie.director);
  const byGenre = movies.filter(m => m.title.toLowerCase() !== title && m.genre === baseMovie.genre);

  res.json({ byDirector, byGenre });
});

// All movies (for landing/home page)
app.get('/all', (req, res) => {
  res.json(movies);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
