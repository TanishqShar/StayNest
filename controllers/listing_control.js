const Listing = require("../models/listing.js");
const ExpressError = require("../utils/ExpressError.js")
const {listingSchema,reviewSchema}=require("../schema.js")

module.exports.new_route = (req, res) => {
    res.render("./listings/new.ejs");
  }
  
module.exports.show_route = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
    .populate({
      path:"reviews",
      populate:{path:"author"},})
      .populate("owner");        //populate is used to get full review through its id
    res.render("./listings/show.ejs", { listing });
}

// module.exports.create_route=async (req, res) => {
//     let url=req.file.path;
//     let filename = req.file.filename;
//   let result = listingSchema.validate(req.body);
//   console.log(result);
//   if(result.error){
//     throw new ExpressError(400,result.error);
//   }
//   const newListing = new Listing(req.body.listing);
//   newListing.owner = req.user._id;
//   newListing.image = {url,filename};
//   await newListing.save(); // throws validation error if bad data
//   req.flash("success","New Listing Created!")
//   res.redirect("/listings");
// }
module.exports.create_route = async (req, res) => {
  // Defensive check on file upload
  if (!req.file) {
    throw new ExpressError(400, "Image file is required");
  }

  const url = req.file.path;
  const filename = req.file.filename;

  const result = listingSchema.validate(req.body);

  if (result.error) {
    let errorMessage = result.error.details.map(el => el.message).join(",");
    throw new ExpressError(400, errorMessage);
  }

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  await newListing.save();

  req.flash("success", "New Listing Created!");
  return res.redirect("/listings");  // Ensure the function exits here
};




module.exports.edit_route = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("./listings/edit.ejs", { listing });
  }

module.exports.update_route = async (req, res) => {
  if(!req.body.listing){
    throw new ExpressError(400,"Send valid data for listing")
  }
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if(typeof req.file !== "undefined"){
      let url=req.file.path;
      let filename = req.file.filename;
      listing.image = {url,filename};
      await listing.save();
    }
    req.flash("success","Listing updated");
    res.redirect(`/listings/${id}`);
  }
module.exports.delete_route = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success","Listing Deleted!")
  res.redirect("/listings");
}
