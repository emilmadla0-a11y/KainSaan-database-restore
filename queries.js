use("dbRestaurants");

db.restaurants.insertOne({
  restaurant_id: 31,
  name: "Sample Restaurant",
  cuisine: "Filipino",
  address: "Angeles City",
  rating: 4.5,
  contact: "09171234599"
});

db.restaurants.find().sort({ restaurant_id: 1 });

db.restaurants.find({ cuisine: "Filipino" });

db.restaurants.find({ rating: { $gte: 4.5 } }).sort({ rating: -1 });

db.restaurants.findOne({ restaurant_id: 31 });

db.restaurants.updateOne(
  { restaurant_id: 31 },
  { $set: { name: "Sample Restaurant Updated", rating: 4.8 } }
);

db.restaurants.deleteOne({ restaurant_id: 31 });

db.restaurants.countDocuments();
