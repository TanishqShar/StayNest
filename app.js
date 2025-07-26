require("dotenv").config();


//npm install multer-storage-cloudinary --legacy-peer-deps
//npm install connect-mongo --legacy-peer-deps

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js")
const {listingSchema,reviewSchema}=require("./schema.js")
const Review = require("./models/review.js")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash=require("connect-flash")
const passport = require("passport")
const LocalStrategy = require("passport-local");
const User = require("./models/user.js")
const{isLoggedin,isOwner,isAuthor} = require("./middleware.js")
const {saveRedirectUrl} = require("./middleware.js")
const listing_controller = require("./controllers/listing_control.js")
const multer = require("multer");
const {storage} = require("./cloudConfig.js")
const upload = multer({storage})
const dburl = process.env.CLOUD_CONNECT;
main()
    .then(()=>{
        console.log("connected to DB");
    })
    .catch((err)=>{
        console.log(err);
    })
async function main(){
    await mongoose.connect("mongodb+srv://tanishqsharma3097:197919812005@cluster0.4iiifxp.mongodb.net/Cluster0?retryWrites=true&w=majority&appName=Cluster0");
}
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")))
const wrapAsync = require("./utils/wrapAsync.js");
const store=MongoStore.create({
  mongoUrl:"mongodb+srv://tanishqsharma3097:197919812005@cluster0.4iiifxp.mongodb.net/Cluster0?retryWrites=true&w=majority&appName=Cluster0",
  crypto:{
    secret:process.env.SECRET,
  },
  touchAfter:24*3600,
})
// store.on("error",()=>{
//   console.log("Error",err);
// })

const sessionOptions={
  store,
  secret:process.env.SECRET,
  resave:false,
  saveuninitialized:true,
  cookie:{
    expires:Date.now()+7*24*60*60*1000,
    maxAge:7*24*60*60*1000,                  //in miliseconds
    httpOnly:true,
  }
};
app.use(session(sessionOptions));
app.use(flash());

//authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser = req.user;
  next();
})

// app.get("/demouser",async(req,res)=>{
//   let fakeUser=new User({
//     email:"student@gmail.com",
//     username:"delta-student",
//   });
//   let registeredUser=await User.register(fakeUser,"helloworld");
//   res.send(registeredUser);
// })



app.get("/",(req,res)=>{
    res.redirect("/listings");
})

const validateReview=(req,res,next)=>{
  let{error}=reviewSchema.validate(req.body);
  if(error){
    let errMsg = error.details.map((el)=>el.message).join(",");
    throw new ExpressError(400,errMsg);
  } else{
    next();
  }
};
// app.get("/testListing",async (req,res)=>{
//     let sampleListing = new Listing({
//         title:"My New Villa",
//         description:"By the beach",
//         price:1200,
//         location:"Calangute, Goa",
//         country:"India",
//     });
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing");
// })

app.get("/signup",(req,res)=>{
  res.render("./Users/signup.ejs")
})

app.post("/signup",wrapAsync(async(req,res,next)=>{
  try{
    let {username,email,password} = req.body;
    let newUser = new User({email,username});
    let registeredUser = await User.register(newUser,password);
    console.log(registeredUser);
    req.login(registeredUser,(err)=>{
      if(err){
        return next(err);
      }
      req.flash("success","Welcome to Wanderlust!");
      res.redirect("/listings");
    })
    
  }catch(err){
    req.flash("error",err.message);
    res.redirect("/signup");
  }
}))
app.get("/login",(req,res)=>{
  res.render("./Users/login.ejs");
})

app.post("/login",saveRedirectUrl,passport.authenticate("local",{
  failureRedirect:"/login",
  failureFlash:true,
}), async(req,res)=>{
  req.flash("success","Welcome back to Wanderlust!");
  let redirectUrl = res.locals.redirectUrl || "/listings";              //after login redirect to requested url
  res.redirect(redirectUrl);
})

app.get("/logout",(req,res,next)=>{
  req.logout((err)=>{
    if(err){
      return next(err);
    }
    req.flash("success","you are logged out!");
    res.redirect("/listings");
  })
})
app.get("/listings",wrapAsync(async(req,res)=>{
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs",{allListings});
}))
//New Route
app.get("/listings/new",isLoggedin, listing_controller.new_route);
//Show Route
app.get("/listings/:id", wrapAsync(listing_controller.show_route));
//Create Route
app.post("/listings",isLoggedin,upload.single("listing[image]"), wrapAsync(listing_controller.create_route));

  //Edit Route
app.get("/listings/:id/edit", isLoggedin,isOwner,wrapAsync(listing_controller.edit_route));
  //Update Route
app.put("/listings/:id", isLoggedin,isOwner,upload.single("listing[image]"),wrapAsync(listing_controller.update_route));
  
  //Delete Route
app.delete("/listings/:id", isLoggedin,isOwner,wrapAsync(listing_controller.delete_route));

//Reviews
//POST Route
app.post("/listings/:id/reviews",validateReview,isLoggedin,wrapAsync(async(req,res)=>{
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);
  newReview.author = req.user._id;
  listing.reviews.push(newReview);
  await newReview.save();
  await listing.save();
  res.redirect(`/listings/${listing._id}`);
}));

app.delete("/:reviewId",isLoggedin,isAuthor,wrapAsync(async(req,res)=>{
  let {id,reviewId}=req.params;
  await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
  await Review.findByIdAndDelete(reviewId);
  req.flash("success","Review Deleted!")
  res.redirect(`/listings/${id}`);
}))
//Middleware
app.use((err,req,res,next)=>{
  let{statusCode=500,message="Something went wrong"}=err;
  res.status(statusCode).send(message);
})
app.listen(8080,()=>{
    console.log("server is listening to port 8080")
})
