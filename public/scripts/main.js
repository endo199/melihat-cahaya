/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

function showLoadingIndicator(position, el) {
    el.insertAdjacentHTML(position, '<div class="mdl-spinner mdl-js-spinner is-active"></div>');
}

function removeLoadingIndicator() {
    document.querySelector(".mdl-spinner").remove();
}

// Initializes MelihatCahaya.
function MelihatCahaya() {
    this.user = null;

    this.checkSetup();

    this.userPic = document.getElementById('user-pic');
    this.userName = document.getElementById('user-name');
    this.signInButton = document.getElementById('sign-in');
    this.signOutButton = document.getElementById('sign-out');

    this.signInButton.addEventListener('click', this.signIn.bind(this));

    this.initFirebase();
}

// Sets up shortcuts to Firebase features and initiate firebase auth.
MelihatCahaya.prototype.initFirebase = function () {
    // Initialize Firebase.
    // shortcut to firebase SDK
    this.auth = firebase.auth();
    this.database = firebase.database();
    this.storage = firebase.storage();

    // Initiates Firebase auth and listen to auth state changes.
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this));
};

// A loading image URL.
MelihatCahaya.LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif';

// Sets the URL of the given img element with the URL of the image stored in Firebase Storage.
MelihatCahaya.prototype.setImageUrl = function (imageUri, imgElement) {
    imgElement.src = imageUri;

    // If the image is a Firebase Storage URI we fetch the URL.
    if (imageUri.startsWith('gs://')) {
        imgElement.src = MelihatCahaya.LOADING_IMAGE_URL; // Display a loading image first.
        //    this.storage.refFromURL(imageUri).getMetadata().then(function(metadata) { // tidak bekerja
        firebase.storage().refFromURL(imageUri).getMetadata().then(function (metadata) {
            imgElement.src = metadata.downloadURLs[0];
        });
    } else {
        imgElement.src = imageUri;
    }
};

// Signs-in Friendly Chat.
MelihatCahaya.prototype.signIn = function (googleUser) {
    // Sign in Firebase with credential from the Google user.
    // Sign in Firebase using popup auth and Google as the identity provider.

    var provider = new firebase.auth.GoogleAuthProvider();
    this.auth.signInWithPopup(provider);
};

// Signs-out of Friendly Chat.
MelihatCahaya.prototype.signOut = function () {
    // sign out firebase
    this.auth.signOut();
};

// Triggers when the auth state change for instance when the user signs-in or signs-out.
MelihatCahaya.prototype.onAuthStateChanged = function (user) {
    if (user) { // User is signed in!
        // Get profile pic and user's name from the Firebase user object.
        var profilePicUrl = user.photoURL;
        var userName = user.displayName;

        // Set the user's profile pic and name.
        this.userPic.style.backgroundImage = 'url(' + profilePicUrl + ')';
        this.userName.textContent = userName;

        // Show user's profile and sign-out button.
        this.userName.removeAttribute('hidden');
        this.userPic.removeAttribute('hidden');
        this.signOutButton.removeAttribute('hidden');

        // Hide sign-in button.
        this.signInButton.setAttribute('hidden', 'true');

        this.user = user;

        // We load currently existing chant messages.
        //    this.loadMessages();
    } else { // User is signed out!
        // Hide user's profile and sign-out button.
        this.userName.setAttribute('hidden', 'true');
        this.userPic.setAttribute('hidden', 'true');
        this.signOutButton.setAttribute('hidden', 'true');

        // Show sign-in button.
        this.signInButton.removeAttribute('hidden');
    }
};

// Returns true if user is signed-in. Otherwise false and displays a message.
MelihatCahaya.prototype.checkSignedInWithMessage = function () {
    /* Check if user is signed-in Firebase. */
    if (this.auth.currentUser) {
        // return true if user sign-in in firebase
        return true;
    }

    // Display a message to the user using a Toast.
    var data = {
        message: 'You must sign-in first',
        timeout: 2000
    };
    this.signInSnackbar.MaterialSnackbar.showSnackbar(data);
    return false;
};

// Resets the given MaterialTextField.
MelihatCahaya.resetMaterialTextfield = function (element) {
    element.value = '';
    element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
};

// Checks that the Firebase SDK has been correctly setup and configured.
MelihatCahaya.prototype.checkSetup = function () {
    if (!window.firebase || !(firebase.app instanceof Function) || !window.config) {
        window.alert('You have not configured and imported the Firebase SDK. ' +
            'Make sure you go through the codelab setup instructions.');
    } else if (config.storageBucket === '') {
        window.alert('Your Firebase Storage bucket has not been enabled. Sorry about that. This is ' +
            'actually a Firebase bug that occurs rarely.' +
            'Please go and re-generate the Firebase initialisation snippet (step 4 of the codelab) ' +
            'and make sure the storageBucket attribute is not empty.');
    }
};

MelihatCahaya.prototype.pushData = function (path, data) {
    var thisDatabase = this.database;
    var promise = new firebase.Promise(function (resolve, reject) {
        var result = thisDatabase.ref(path).push(data, function (error) {
            if (error)
                reject(error.message);
            else
                resolve(result.key);
        });
    });

    return promise;
};

MelihatCahaya.prototype.setData = function (path, data) {
    var thisDatabase = this.database;
    var promise = new firebase.Promise(function (resolve, reject) {
        var result = thisDatabase.ref(path).set(data, function (error) {
            if (error)
                reject(error.message);
            else
                resolve(result.key);
        });
    });

    return promise;
};

MelihatCahaya.prototype.getData = function (path, params = null) {
    var thisDatabase = this.database;
    var promise = new firebase.Promise(function(resolve, reject){
        var query = thisDatabase.ref(path);
        
        if(params) {
            for(var key in params) {
                query = query.orderByChild(key).equalTo(params[key]);
                break;
            }
        }
        
        query.on('value', function (snapshot) {
            resolve(snapshot);
        });
    });
    
    return promise;
};

MelihatCahaya.prototype.updateData = function(path, params) {
    var thisDatabase = this.database;
    return thisDatabase.ref(path).update(params);
};

MelihatCahaya.prototype.upload = function (fileObj, path, fileName = null) {
    if (!fileName) {
        fileName = fileObj.name;
    }

    var thisStorage = this.storage;

    var promise = new firebase.Promise(function (resolve, reject) {
        var uploadTask = thisStorage.ref(path + "/" + fileName).put(fileObj);
        uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function (snapshot) {
            console.log("XXX " + snapshot.state + " " + parseInt(snapshot.bytesTransferred / snapshot.totalBytes * 100) + "%");
        }, function (error) {
            reject(error.message);
        }, function () {
            var downloadUrl = uploadTask.snapshot.downloadURL;
            resolve(downloadUrl);
        });
    });

    return promise;
};

MelihatCahaya.prototype.getUser = function () {
    //    return firebase.auth().currentUser;
    return this.user;
}

// creating new projects
//MelihatCahaya.prototype.addProject = function () {
//    console.log("XXX adding new project");
//
//    this.judul = document.getElementById('judul').value;
//    this.penulis = document.getElementById('penulis').value;
//    this.isbn = document.getElementById('isbn').value;
//
//    console.log(this.judul + " oleh " + this.userName.textContent);
//
//    this.database.ref('projects/' + this.isbn.replace(/-/g, "")).set({
//        'judul': this.judul,
//        'penulis': this.penulis,
//        'isbn': this.isbn,
//        'dibuatOleh': this.userName.textContent
//    });
//};

//MelihatCahaya.prototype.projects = function () {
//    console.log('XXX current user: ' + this.auth.currentUser);
//
//    var displayProject = function (judul, penulis, isbn) {
//        var container = document.createElement("li");
//        container.setAttribute('class', "mdl-list__item");
//        var href = document.createElement("a");
//        href.setAttribute('class', 'mdl-list__item-primary-content');
//        href.textContent = judul;
//        href.setAttribute('href', 'project.html?isbn=' + isbn);
//        //        document.appendChild(span)
//        container.appendChild(href);
//
//        document.getElementById('projectList').appendChild(container);
//    };
//
//    this.database.ref('projects').once('value').then(function (snapshot) {
//        if (snapshot.hasChildren()) {
//            snapshot.forEach(function (childSnapshot) {
//                if (childSnapshot.hasChild('judul')) {
//                    displayProject(
//                        childSnapshot.child('judul').val(),
//                        childSnapshot.child('penulis').val(),
//                        childSnapshot.child('isbn').val()
//                    );
//                }
//            });
//        } else {
//            console.log(snapshot.val());
//        }
//    })
//};

//MelihatCahaya.prototype.projectDetail = function (isbn) {
//    console.log("XXX accesing project detail");
//
//    this.database.ref('projects/' + isbn).once('value').then(function (snapshot) {
//        //        snapshot.forEach(function(childSnapshot){
//        //            console.log("XXX "+childSnapshot.key);
//        //            console.log("XXX "+childSnapshot.val());
//        //        });
//        document.getElementById('title').textContent = snapshot.child('judul').val();
//    });
//
//    var setImageUrl = this.setImageUrl;
//
//    // load scans of the book
//    this.database.ref('scans/' + isbn).on('value', function (scanSnapshot) {
//        console.log('XXX scans ' + scanSnapshot.val());
//        var scanned = document.getElementById('scanned');
//
//        var liTag, imgTag;
//        scanSnapshot.forEach(function (imgSnapshot) {
//            liTag = document.createElement("li");
//            liTag.setAttribute('class', 'mdl-list__item');
//
//            imgTag = document.createElement('img');
//
//            liTag.appendChild(imgTag);
//            scanned.appendChild(liTag);
//
//            var theFile = "gs://melihat-cahaya.appspot.com/scans/" + isbn + "/" + imgSnapshot.child('file').val();
//            setImageUrl(theFile, imgTag);
//        });
//    });
//};

//MelihatCahaya.prototype.uploadScan = function (isbn, pageNum, file) {
//    var fileName = pageNum + ".jpg";
//    var db = this.database;
//
//    var uploadTask = this.storage.ref("scans/" + isbn + "/" + fileName).put(file);
//    uploadTask.on('state_changed', function (snapshot) {
//        console.log(snapshot);
//    }, function (error) {
//        alert(error.message);
//    }, function () {
//        var downloadUrl = uploadTask.snapshot.downloadURL;
//        console.log("XXX download URL: " + downloadUrl);
//
//        // add to databse
//        db.ref('scans/' + isbn).push({
//            'file': fileName,
//            'text': ""
//        });
//    });
//}

//window.onload = function() {
//    window.melihatCahaya = new MelihatCahaya();
////    window.melihatCahaya.projects();
//};