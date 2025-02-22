/**
 * config for host and port. Default: http://localhost:3000
 */
const host = 'localhost';
const port = 3000;

/**
 * for using environment variables
 */
if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config()
}


/**
 * requirements
 */
const express = require('express');
const server = express();
const path = require('path');
const passport = require('passport');
const flash = require('express-flash')
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy
const fs = require('fs')
let assert = require('assert');
let pythonBridge = require('python-bridge');
/**
 * used as a encryption tool for passwords
 */
const bcrypt = require('bcrypt');
const req = require('express/lib/request');
//json file with all of our userdata used for saving our users
//(can later be changed to MongoDB and realized with the mongoose package)
var userdata = require('./userdata.json');
const methodOverride = require('method-override');
let python = pythonBridge();
server.use(methodOverride('_method'));
server.use("/css", express.static(path.join(__dirname, "css")));
server.use("/assets", express.static(path.join(__dirname, "assets")));
server.use("/pages", express.static(path.join(__dirname, "views")));
server.use("/js", express.static(path.join(__dirname, "js")));
server.use(flash())
server.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
}))
server.use(passport.initialize())
server.use(passport.session())
//Our server is listening on the supplied host and port
server.listen(port)
server.use(express.urlencoded({ extended: false }));
console.log(`Server is running on http://${host}:${port}`);

/**
 *call for initializing user
 */
initialize();


/**
 * defines view engine as ejs
 */
server.set('view-engine', 'ejs');


/**
 * defines root as index.ejs
 * @param req "/"
 * @param res index ejs
 */
server.get('/', (req, res) => {
	res.render('index.ejs', {
		isAuth: req.isAuthenticated(),
	});
})


/**
 * handles redirect to login (only accessable if user isn't autheitcated)
 */
server.get('/login', isNotAuth, (req, res) => {
	res.render('loginpage.ejs',);
})


/**
 * handles login with passport
 */
server.post('/login', passport.authenticate('local', {
	successRedirect: '/preferences',
	failureRedirect: '/login',
	failureFlash: true
}))


/**
 * redirects to preference page
 */
server.get('/preferences', isAuth, (req, res) => {
	res.render('preferences.ejs', {
		isAuth: req.isAuthenticated(),
	});
})


/**
 * redirects user to about us page
 * @param req /about us is requested
 * @param res about us page
 */
server.get('/aboutus', (req, res) => {
	res.render('aboutus.ejs', {
		isAuth: req.isAuthenticated(),
	})
})


/**
 * redirects user to impressum
 */
server.get('/impressum', (req, res) => {
	res.render('impressum.ejs', {
		isAuth: req.isAuthenticated(),
	})
})


/**
 * if user is authenticated load projects view
 * @param req {"/projects"} requests projects page
 * @param res {isAuth}  authenticated
 */
server.get('/projects', isAuth, (req, res) => {
	res.render('projects.ejs', {
		isAuth: req.isAuthenticated(),
	})
})


/**
 * redirects user to create projects page if authenticated
 * @param res{"/create"} user requests to see create project page
 * @param req {isAuth}
 */
server.get('/create', isAuth, (req, res) => {
	res.render('createproject.ejs', {
		isAuth: req.isAuthenticated(),
	})
})


/**
 * redirects user to registerpage
 */
server.get('/register', isNotAuth, (req, res) => {
	res.render('registerpage.ejs', {
		isAuth: req.isAuthenticated(),
	});
})


/**
 * passes User data of register form
 * checks input validity and initiates error or valid input protocoll
 * => redirects to pages after login or passes error messages
 * @async
 * @param id
 * @param email
 * @param username
 *
 */
server.post('/register', async (req, res) => {
	let id = Date.now().toString();
	let username = req.body.username;
	let email = req.body.email;
	const bcryptpassword = await bcrypt.hash(req.body.password,10);
	let gender = req.body.rememberradiobox;
	let termsofservice = req.body.termsofservice;
	const user = userdata.find(user => user.username === username);

	
	if (!termsofservice) {
		return res.render("registerpage.ejs", {
			errorMessage: 'Sie müssen die Nutzungsbedingungen akzeptieren'
		});
	}
	else {
		if(req.body.password === req.body.password2){
			try {
				if (user != null) {
					return res.render("registerpage.ejs", {
						errorMessage: 'Ein Nutzer mit diesem Usernamen existiert bereits'
					});
				}
				else {
					val_username = username
				}
				userdata.push({
					email: email,
					gender: gender,
					username: val_username,
					password: bcryptpassword,
					id: id,
				})
	
				fs.writeFileSync('./userdata.json', JSON.stringify(userdata, null, 2));
	
				console.log("Erfolgreich Account angelegt");
				console.log(userdata);
				res.redirect('/login')
			} catch (error) {
				console.log(error)
				res.redirect('/register')
			}
		}
		else{
			return res.render("registerpage.ejs", {
				errorMessage: 'Bitte achte darauf, dass deine Passwörter dieselben sind'
			});
		}
	}
})


/**
 * lookup the current user for login inside json file and
 * give out error message if password or username is wrong
  */
async function validateLogin(username, password, done) {
	const user = userdata.find(user => user.username === username);
	if (user == null) {
		//if there is no such user display an error message (errotext is shown in registerpage.ejs)
		return done(null, false, {
			message: 'Dieser Nutzer existiert nicht'
		})
	}
	try {
		if (await bcrypt.compare(password, user.password)) {
			return done(null, user)
		} else {
			//if the password is wrong display an error message (errotext is shown in registerpage.ejs)
			return done(null, false, {
				message: 'Falches Passwort. Bitte versuche es erneut.'
			})
		}
	} catch (error) {
		return done(null, false, {
			message: 'Es ist ein unerwarteter Fehler aufgetreten. Versuche es später erneut'
		})
	}
}


//Inititalize Userlogin
function initialize() {
	var user = validateLogin
	passport.use(new LocalStrategy({ usernameField: 'username' }, user))
	passport.serializeUser((user, done) => done(null, user.id))
	passport.deserializeUser((id, done) => {
		return done(null, userdata.find(user => user.id === id))
	})
}


/**checking if User is Authenticated
used for the case that the user isn't authenticated yet and if so making him unable to visit
 */
function isAuth(req, res, next) {
	if (req.isAuthenticated()) {
		return next()
	}
	res.redirect('/login')
}


//used for the case that user is already authenticated for example making him unable to go back to the login page
function isNotAuth(req, res, next) {
	if (req.isAuthenticated()) {
		return res.redirect('/')
	}
	next()
}


//Logout
server.delete('/logout', (req, res) => {
	req.logOut()
	res.redirect('/')
})

/**
 * 404 page redirect
 */
 server.get('*', (req, res) => {
	res.sendFile(__dirname + '/views/404_page.html');
})

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");

    if (i_should_exit)
        process.exit();
});

var args = process.argv.slice(2);
if(args.length>0){
	console.log(args);
	if(args[0]==="test"){
	console.log("Test done, Exiting..");
	process.exit(0);
	}
}