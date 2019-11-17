// RP_20191114.
// mopod
// A web-based podcast player utilizing the Listen Notes directory API.
// Functionality includes:
//  - Randomizer.
//  - Subscriptions.
//  - Save for Later List.
//  - Search.
// Front end: JavaScript.
// Back end: Python / SQLite3 / MySQL.


var mopod = 
{
  
  // Public objects.
  jObj_subscriptions: {},
  jObj_laterList: {},


  // The kickoff function, called from the HTML page.
  init: function()
  {
    // The default tab to open to.
    document.getElementById("roulette").style.display = "block";
    // 
    mopod.getGenres();
    //mopod.getLaterListFromAPI();
    mopod.getSubscriptionsFromAPI();
  },
  
  
  // Deprecated.
  listenNotes: function(url)
  {
    let reqObj, reqUrl;
    // Create HTTP request object.
    reqObj = new XMLHttpRequest();
    // Construct the webservice URL.
    reqUrl = "/roulette";   
    // Set up the get request.
    reqObj.open("GET", reqUrl, true);    
    // Send request. Parameters are in URL.
    reqObj.send();  
  },
  

  // Query db for categories to be used for searches.
  getGenres: function()
  {
    let i = 0;
    let payload = "";
    let genres = [];
    let jObj = {};
    let reqObj = new XMLHttpRequest();
    let reqUrl = "/getGenres"; 

    reqObj.open("GET", reqUrl, true);    
    reqObj.send();

    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        jObj = JSON.parse(reqObj.response);
        
        payload += "<p>Category:</p>";
        payload += "<select id=\"genreDropdown\">";
        
        for(i = 0; i < jObj.length; i++)
        {
          payload += "  <option value=\"" + jObj[i][0] + "\">" + jObj[i][1] +"</option>";
        }
        
        document.getElementById("genres").innerHTML = payload;
      }
    }
  },  

  
  // Pick one podcast at random.
  spinRoulette: function()
  {
    let pubDate = "";
    let payload = "";
    let reqObj, reqUrl;
    // Create HTTP request object.
    reqObj = new XMLHttpRequest();
    // Construct the webservice URL.
    reqUrl = "/spinRoulette";   
    // Set up the get request.
    reqObj.open("GET", reqUrl, true);    
    // Send request. Parameters are in URL.
    reqObj.send();    
    // Upon successful webservice return...
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        // Make the return into json.
        jObj = JSON.parse(reqObj.response);
        pubDate = new Date(jObj.pub_date_ms);
        
        payload += "<div class=\"row\">";
        payload += "<div class=\"col-12\">";      
        payload += "<button onclick=\"mopod.spinRoulette();\">Spin Again</button>";
        payload += "<button onclick=\"mopod.insertLaterList('" + jObj.id + "');\">Save for Later</button>";
        payload += "<button onclick=\"mopod.insertSubscription('" + jObj.podcast_id + "');\">Subscribe</button>";
        payload += "</div>";
        payload += "</div><br>";
        payload += "  <div class=\"row\">";
        payload += "    <div class=\"col-12 col-lg-6\">";
        payload += "      <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" />";
        //payload += "      <audio controls><source src=\"" + jObj.audio + "\" /></audio>";
        payload += "    </div>";
        payload += "    <div class=\"col-12 col-lg-6\">";
        payload += "      <h1 class=\"podcastTitle\">" + jObj.podcast_title + "</h1>";
        payload += "      <p class=\"publisher\">" + jObj.publisher + "</p>";
        payload += "      <h2 class=\"episodeTitle\"><a class=\"playerIcon\" href=\"javascript: mopod.play('" + jObj.id + "');\">" + jObj.title + "</a></h2>";
        payload += "      <p class=\"pubDate\">" + pubDate + "</p>";
        payload += "      <p class=\"episodeDescription\">" + jObj.description + "</p>";
        payload += "    </div>";
        payload += "  </div>";
 
        document.getElementById("rouletteResult").innerHTML = payload;
        
        document.getElementById("rouletteResult").setAttribute("data-episodeid", jObj.id);
        document.getElementById("rouletteResult").setAttribute("data-podcastid", jObj.podcast_id);
      }
    }
  },
  
  
  // Search for podcasts or specific episodes within user-selected category.
  search: function()
  {
    let i = 0, j = 0, k = 0;
    let payload = "";
    let pubDate = "";
    let reqObj, reqUrl, jObj;
    let searchType = "";
    let genre = "";
    
    document.getElementById("searchResults").innerHTML = "<img src=\"/static/img/loading.gif\" width=\"50\" />";
    
    // Check if user wants overall podcast or specific episodes.
    let searchTypes = document.getElementsByName("searchType");
    for(j = 0; j < searchTypes.length; j++)
    {
      if(searchTypes[j].checked === true)
      {
        searchType = searchTypes[j].value;
      }
      else
      {
        searchType = "episode"
      }
    }
    
    // Check which category to search within.
    let genres = document.getElementById('genreDropdown').options;
    genre = genres[genres.selectedIndex].value;
    if(genre === "")
    {
      alert("Please choose a category.");
      return false;
    } 
    
    // Create HTTP request object.
    reqObj = new XMLHttpRequest();
    // Construct the webservice URL.
    reqUrl = "/search?query=" + document.getElementById("searchInput").value + "&type=" + searchType + "&genreId=" + genre;  
    // Set up the get request.
    reqObj.open("GET", reqUrl, true);    
    // Send request. Parameters are in URL.
    reqObj.send();    
    // Upon successful webservice return...
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        // Make the return into json.
        jObj = JSON.parse(reqObj.response);
        //console.log(jObj);
        
        payload = "<div class=\"row\">";
        
        if(jObj.count > 0)
        {
          for(i = 0; i < jObj.count; i++)
          {
            pubDate = new Date(jObj.results[i].pub_date_ms);
            
            payload += "<div class=\"col-6 col-lg-2 searchResult\" data-episodeid=\"" + jObj.results[i].id + "\" data-podcastid=\"" + jObj.results[i].podcast_id + "\" data-ms=\"" + jObj.results[i].podcast_id + "\">";
            payload += "<img class=\"img-fluid\" src=\"" + jObj.results[i].thumbnail + "\" />";
            payload += "<button onclick=\"mopod.insertSubscription();\">Subscribe</button>";
            if(searchType === "episode")
            {
              payload += "<button onclick=\"mopod.laterList('" + jObj.results[i].id + "');\">Save for Later</button>";
            }
            payload += "<h2 class=\"podcastTitle\">" + jObj.results[i].podcast_title_original + "</h2>";
            payload += "<p class=\"publisher\">" + jObj.results[i].publisher_original + "</p>";
            payload += "<h2 class=\"episodeTitle\">";
            if(searchType === "episode")
            {
              payload += "<a class=\"playerIcon\" href=\"javascript: mopod.play('" + jObj.results[i].id + "');\">";
            }
            payload += jObj.results[i].title_original;
            if(searchType === "episode")
            {
              payload += "</a>";
            }         
            payload += "</h2>";
            payload += "<p class=\"pubDate\">" + pubDate + "</p>";
            payload += "</div>";
          }
        }
        else
        {
          payload += "No results.";
        }
        
        payload += "</div>";
        
        document.getElementById("searchResults").innerHTML = payload;
      }
    }   
  },
  
  
  // The subscription functions.
  // Query db for IDs for user and then call API for complete details.
  getSubscriptionsFromAPI: function()
  {
	  let payload = "";
	  let jObj = {};
	    
	  // Test if object already in memory. If so, don't make API call again.
	  if(mopod.jObj_subscriptions.length === undefined)
	  {
	    let reqObj = new XMLHttpRequest();
	    let reqUrl = "/getSubscriptions";
	    
	    document.getElementById("subscriptionResults").innerHTML = "<img src=\"/static/img/loading.gif\" width=\"50\" />";
	    
	    reqObj.open("GET", reqUrl, true);
	    reqObj.send();
	
	    reqObj.onreadystatechange = function()
	    {
	      if(reqObj.readyState === 4)
	      {
		      // This will be a nested array of several POST calls.
	        mopod.jObj_subscriptions = JSON.parse(reqObj.response);
	        jObj = mopod.jObj_subscriptions;
	        //jObj = mopod.jObj_subscriptions.sort(mopod.compareValues("title", "asc"));
	
	        for(let i = 0; i < jObj.length; i++)
	        {
		        for(let j = 0; j < jObj[i].podcasts.length; j++)
		        {
			        payload += mopod.getSubscriptionHTML(jObj[i].podcasts[j]);
		        }
	          
	        }        
		      if(payload !== "")
		      {
		        document.getElementById("subscriptionResults").innerHTML = payload;
		      }
		      else
		      { 
		        document.getElementById("subscriptionResults").innerHTML = "Add subscriptions in the Roulette or Search panels.";
		      }      
	        
	/*
	        let quantities = document.getElementsByName("episodeQty");
	        for(k = 0; k < quantities.length; k++)
	        {
	          quantities[k].onclick = function()
	          {
	            mopod.getSubscriptions(this.value);
	          }
	        }
	*/
	      }
		  }
		}
		// Use cached object.
    else
    {
     	jObj = mopod.jObj_subscriptions;

      for(let i = 0; i < jObj.length; i++)
      {
        for(let j = 0; j < jObj[i].podcasts.length; j++)
        {
	        payload += mopod.getSubscriptionHTML(jObj[i].podcasts[j]);
        }
        
      }        
      if(payload !== "")
      {
        document.getElementById("subscriptionResults").innerHTML = payload;
			}
    }
  },
  // Insert into db and also DOM and public jObj.
  insertSubscription: function()
  { 
	  id = event.currentTarget.offsetParent.dataset.podcastid;
	  
    reqObj = new XMLHttpRequest();
    reqUrl = "/insertSubscription?id=" + id;
    reqObj.open("GET", reqUrl, true);
    reqObj.send();
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        jObj = JSON.parse(reqObj.response);
        mopod.jObj_subscriptions.push(jObj);

        mopod.openTab(null, "subscriptions");
        document.getElementsByClassName("tabLinks")[4].className += " active";

        podcast = mopod.getSubscriptionHTML(jObj, 3);
        document.getElementById("subscriptionResults").insertAdjacentHTML("afterbegin", podcast);
      }
    }
  },
  // Delete from db and also from DOM and jObj.
  deleteSubscription: function(id)
  {
    let reqObj = {};
    let reqUrl = "";
    let podcast = "";

    // Remove from db.
    reqObj = new XMLHttpRequest();
    reqUrl = "/deleteSubscription?podcastid=" + id;   
    reqObj.open("GET", reqUrl, true);    
    reqObj.send();
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        // Remove from jObj_subscriptions.
        for(let i = 0; i < mopod.jObj_subscriptions.length; i++)
        {
          if(mopod.jObj_subscriptions[i].id === id)
          {
            mopod.jObj_subscriptions.splice(i, 1);
          }
        }
        // Update DOM.
        podcast = document.getElementById("subscriptions").querySelector("[data-podcastid='" + id + "']");
        podcast.parentNode.removeChild(podcast);
      }
    }
  },
  // Helper to build out the HTML.
  getSubscriptionHTML: function(jObj)
  {
    let payload = "";
    let pubDate = "";
    let audioLength = "";
    // This will be a nested array of POST calls.
    let jObjEpisodes = mopod.jObj_subscriptions.latest_episodes;

    payload += "<div class=\"col-6 col-lg-2\" data-podcastid=\"" + jObj.id + "\">";
    payload += "  <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" alt=\"" + jObj.description + "\" />";
    payload += "  <button class=\"play\" onclick=\"javascript: mopod.playSubscription('" + jObj.id + "');\">Open in Player</button>";
    payload += "  <a class=\"remove\" href=\"javascript:mopod.deleteSubscription('" + jObj.id + "')\">Unsubscribe</a>";
    payload += "  <h2 class=\"podcastTitle\">" + jObj.title + "</h2>";
    payload += "    <p class=\"publisher\">" + jObj.publisher + "</p>";
    payload += "  <div class=\"episodes\">";
    
/*
    for(let i = 0; i < jObjEpisodes.length; i++)
    {
	    for(let j = 0; j < jObjEpisodes[i].length; j++)
      if(jObjEpisodes[i].podcast_id === jObj.id)
      {
        pubDate = mopod.formatDate(jObjEpisodes[i].pub_date_ms);
        audioLength = mopod.formatAudioLength(jObjEpisodes[i].audio_length_sec);

        payload += "  <p class=\"date\">" + pubDate + "</p>";
        payload += "  <p class=\"episode\"><a class=\"playerIcon\" class=\"playerIcon\" href=\"javascript: mopod.play('" + jObjEpisodes[i].id + "','subscriptionEpisode');\">" + jObjEpisodes[i].title + "</a></p>";
        payload += "  <p class=\"time\">" + audioLength + "</p>";
      }
    }
*/
    
    payload += "  </div>";
    payload += "</div>";

    return payload;
  },


  // The Later List functions.
  // Query db for IDs for user and then call API for complete details.
  getLaterListFromAPI: function()
  {
    let payload = "";
    let jObj = {};
    
		// Test if object already in memory. If so, don't make API call again.
	  if(mopod.jObj_laterList.length === undefined)
	  {
	    let reqObj = new XMLHttpRequest();
	    let reqUrl = "/getLaterList";   
	    
	    document.getElementById("laterListResults").innerHTML = "<img src=\"/static/img/loading.gif\" width=\"50\" />";
	    
	    reqObj.open("GET", reqUrl, true);    
	    reqObj.send();
	    reqObj.onreadystatechange = function()
	    {
	      if(reqObj.readyState === 4)
	      {
	        mopod.jObj_laterList = JSON.parse(reqObj.response);
	        jObj = mopod.jObj_laterList;
	        //jObj = mopod.jObj_laterList.sort(mopod.compareNestedValues("episodes", "title", "asc"));
	        
	        if(jObj !== undefined && jObj.episodes.length > 0)
	        {
	          for(let i = 0; i < jObj.episodes.length; i++)
	          {
	            if(jObj.episodes[i] && Object.keys(jObj.episodes[i]).length !== 0)
	            {
	              payload += mopod.buildLaterListHTML(jObj.episodes[i]);
	            }
	          }
	        }
	        else
	        {
	          payload = "Add episodes in the Roulette or Search panels.";
	        }
	        
	        document.getElementById("laterListResults").innerHTML = payload;
	      }
	    }
	  }
	  // Used cached object.
	  else
	  {
  	  jObj = mopod.jObj_laterList;
      
      if(jObj !== undefined && jObj.episodes.length > 0)
      {
        for(let i = 0; i < jObj.episodes.length; i++)
        {
          if(jObj.episodes[i] && Object.keys(jObj.episodes[i]).length !== 0)
          {
            payload += mopod.buildLaterListHTML(jObj.episodes[i]);
          }
        }
      }
	  }
  },
  // Insert into db and also DOM and public jObj.
  insertLaterList: function(id)
  {
    let reqObj, reqUrl;
    
    reqObj = new XMLHttpRequest();
    reqUrl = "/insertLaterList?episodeid=" + id;   
    reqObj.open("GET", reqUrl, true);    
    reqObj.send();
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        mopod.getLaterList();
                
        mopod.openTab(null, "laterList");
        document.getElementsByClassName("tabLinks")[3].className += " active";
      }
    }
    
  },
  // Delete from db and also from DOM and jObj.
  deleteLaterList: function(id)
  {
    let reqObj = {};
    let reqUrl= "";
    
    // Remove from db.
    reqObj = new XMLHttpRequest();
    reqUrl = "/deleteLaterList?episodeid=" + id;   
    reqObj.open("GET", reqUrl, true);    
    reqObj.send();

    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        // Remove from jObj_subscriptions.
        for(let i = 0; i < mopod.jObj_laterList.length; i++)
        {
          if(mopod.jObj_laterList[i].id === id)
          {
            mopod.jObj_laterList.splice(i, 1);
          }
        }
        // Update DOM.
        episode = document.getElementById("laterList").querySelector("[data-episodeid='" + id + "']");
        episode.parentNode.removeChild(episode);
      }
    }
  },
  // Helper to build out the HTML.
  buildLaterListHTML: function(jObj)
  {
    let payload = "";

    let pubDate = mopod.formatDate(jObj.pub_date_ms);
    let audioLength = mopod.formatAudioLength(jObj.audio_length_sec);

    payload += "<div class=\"col-6 col-lg-2\" data-episodeid=\"" + jObj.id + "\">";
    payload += "  <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" alt=\"\" />";
    payload += "  <a class=\"remove\" href=\"javascript:mopod.deleteLaterList('" + jObj.id + "')\">Remove</a>";
    payload += "  <h2 class=\"podcastTitle\">" + jObj.podcast_title + "</h2>";
    payload += "    <p class=\"publisher\">" + jObj.publisher + "</p>";
    payload += "    <p class=\"date\">" + pubDate + "</p>";
    payload += "  <p class=\"episode\"><a class=\"playerIcon\" href=\"javascript: mopod.play('" + jObj.id + "','laterListEpisode');\">" + jObj.title + "</a></p>";
    payload += "  <p class=\"time\">" + audioLength + "</p>";
    payload += "</div><br>";

    return payload;
  },


  // Audio player functions.
  // Play.
  playSubscription: function(id)
  {
    let pubDate = "";
    let payload = "";
    let jObj = {};
    
		let reqObj, reqUrl;
    reqObj = new XMLHttpRequest();
    reqUrl = "/getSubscription?podcastID=" + id;   
    reqObj.open("GET", reqUrl, true);    
    reqObj.send();
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
				jObj = JSON.parse(reqObj.response);
	    	
		    for(let i = 0; i < jObj.length; i++)
		    {
			    if(jObj[i].id === id)
			    {
				    jObj = jObj[i];
			    }
		    }  
		    
		    payload += "  <div class=\"row\">";
		    payload += "    <div class=\"col-12 col-lg-6\">";
		    payload += "      <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" /><br><br>";
		    payload += "      <div id=\"audioControls\">";
		    payload += "        <audio controls><source src=\"" + jObj.episodes[0].audio + "\" /></audio>";
		    payload += "        <img src=\"/static/img/icon_rewind.png\" onclick=\"javascript: mopod.rewind();\" />";
		    payload += "        <img src=\"/static/img/icon_forward.png\" onclick=\"javascript: mopod.forward();\" />";
		    payload += "        <h2 class=\"episodeTitle\">" + jObj.episodes[0].title + "</h2>";
		    payload += "        <p class=\"pubDate\">" + new Date(jObj.episodes[0].pub_date_ms) + "</p>";
		    payload += "        <p class=\"description\">" + jObj.episodes[0].description + "</p>";
		    payload += "      </div>";
		    payload += "    </div>";
		    payload += "    <div class=\"col-12 col-lg-6\">";
		    payload += "      <h1 class=\"podcastTitle\">" + jObj.title + "</h1>";
		    payload += "      <p class=\"publisher\">" + jObj.publisher + "</p>";
		    payload += "        <p class=\"description\">" + jObj.description + "</p>";
		    payload += "    	<p>MOST RECENT EPISODES</p>";
		    payload += "    	<ul>";
		    
		    for(let j = 1; j < 10; j++)
		    {
			    payload += "      <li>" + jObj.episodes[j].title + "</li>";
		    }
		    
		    payload += "      </ul>";		    		    
		    payload += "    </div>";		    		    
		    payload += "  </div>";
		    
		    document.getElementById("playerResult").innerHTML = payload;
		    
		    document.getElementById("playerResult").setAttribute("data-episodeid", jObj.id);
		    //document.getElementById("playerResult").setAttribute("data-podcastid", jObj.podcast_id);
		    
		    mopod.openTab(null, "player");
		    document.getElementsByClassName("tabLinks")[0].className += " active";
		  }
    }
  },
  
  
  // Play.
  playLaterList: function(id, list)
  {
    let pubDate = "";
    let payload = "";
    let jObj = {};
    
    switch(list)
    {
	    case "subscription":
	    	let reqObj, reqUrl;
		    reqObj = new XMLHttpRequest();
		    reqUrl = "/getPodcast?podcastid=" + id;   
		    reqObj.open("GET", reqUrl, true);    
		    reqObj.send();
		    reqObj.onreadystatechange = function()
		    {
		      if(reqObj.readyState === 4)
		      {

		      }
		    }
	    case "laterListEpisode":
	    	jObj = mopod.jObj_laterList.episodes;
	    	break;
	  }
	    	
    for(let i = 0; i < jObj.length; i++)
    {
	    if(jObj[i].id === id)
	    {
		    jObj = jObj[i];
	    }
    }  
    pubDate = new Date(jObj.pub_date_ms);
    
    payload += "  <div class=\"row\">";
    payload += "    <div class=\"col-12 col-lg-6\">";
    payload += "      <button onclick=\"mopod.insertLaterList('" + jObj.id + "');\">Save for Later</button>";
    payload += "      <button onclick=\"mopod.insertSubscription('" + jObj.podcast_id + "');\">Subscribe</button><br><br>";
    payload += "      <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" /><br><br>";
    payload += "      <div id=\"audioControls\">";
    payload += "        <audio controls><source src=\"" + jObj.audio + "\" /></audio>";
    payload += "        <img src=\"/static/img/icon_rewind.png\" onclick=\"javascript: mopod.rewind();\" />";
    payload += "        <img src=\"/static/img/icon_forward.png\" onclick=\"javascript: mopod.forward();\" />";
    payload += "      </div>";
    payload += "    </div>";
    payload += "    <div class=\"col-12 col-lg-6\">";
    payload += "      <h1 class=\"podcastTitle\">" + jObj.podcast_title + "</h1>";
    payload += "      <p class=\"publisher\">" + jObj.publisher + "</p>";
    payload += "      <h2 class=\"episodeTitle\">" + jObj.title + "</h2>";
    payload += "      <p class=\"pubDate\">" + pubDate + "</p>";
    payload += "      <p class=\"description\">" + jObj.description + "</p>";
    payload += "    </div>";
    payload += "  </div>";
    
    document.getElementById("playerResult").innerHTML = payload;
    
    document.getElementById("playerResult").setAttribute("data-episodeid", jObj.id);
    document.getElementById("playerResult").setAttribute("data-podcastid", jObj.podcast_id);
    
    mopod.openTab(null, "player");
    document.getElementsByClassName("tabLinks")[0].className += " active";
  },
  // Rewind 10 seconds.
  rewind: function()
  {
    let audio = document.getElementById("audioControls").getElementsByTagName("audio")[0];
    audio.currentTime -= 10.0;
  },
  // Fast forward 10 secs.
  forward: function()
  {
    let audio = document.getElementById("audioControls").getElementsByTagName("audio")[0];
    audio.currentTime += 10.0;
  },
  
  
  // Misc helper functions.
  // The top nav tab systems
  openTab: function(evt, panel) 
  {
    let i, tabContent, tabLinks;
    tabContent = document.getElementsByClassName("tabContent");
    for (i = 0; i < tabContent.length; i++) 
    {
      tabContent[i].style.display = "none";
    }
    tabLinks = document.getElementsByClassName("tabLinks");
    for (i = 0; i < tabLinks.length; i++) 
    {
      tabLinks[i].className = tabLinks[i].className.replace(" active", "");
    }
    document.getElementById(panel).style.display = "block";
    if(evt !== null)
    {
      evt.currentTarget.className += " active";
    }
    
  },


  // Calculate length of episode.
  formatAudioLength: function(seconds)
  {
    let time = new Date(null);
    time.setSeconds(seconds);
    let audioLength = time.toISOString().substr(11, 8);
    return audioLength;
  },
  

  // Calculate length of episode.
  formatDate: function(milliseconds)
  {
    let date = new Date(milliseconds);
    let yyyy = date.getFullYear();
    let mm = date.getMonth() + 1;
    if(mm < 10) { mm = "0" + mm; }
    let dd = date.getDate();
    if(dd < 10) { dd = "0" + dd; }
    formattedDate = yyyy + "." + mm + "." + dd;
    return formattedDate;
  },
  

  // Sorting.
  // Taken from Sitepoint blog (Olayinka Omole): https://www.sitepoint.com/sort-an-array-of-objects-in-javascript/
  compareValues: function(key, order='asc')
  {
    return function(a, b) 
    {
      if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) 
      {
        return 0; 
      }
      
      const varA = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
      const varB = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];
        
      let comparison = 0;
      if (varA > varB) 
      {
        comparison = 1;
      } 
      else if (varA < varB) 
      {
        comparison = -1;
      }
      return ((order == 'desc') ? (comparison * -1) : comparison);
    }
  },
  // Modified to drill down to get the podcast title for episodes.
  compareNestedValues: function(key1, key2, order='asc')
  {
    return function(a, b) 
    {
      if(!a.hasOwnProperty(key1) || !b.hasOwnProperty(key1) || !a.hasOwnProperty(key2) || !b.hasOwnProperty(key2)) 
      {
        return 0; 
      }
      
      const varA = (typeof a[key1][key2] === 'string') ? a[key1][key2].toUpperCase() : a[key1][key2];
      const varB = (typeof b[key1][key2] === 'string') ? b[key1][key2].toUpperCase() : b[key1][key2];
        
      let comparison = 0;
      if (varA > varB) 
      {
        comparison = 1;
      } 
      else if (varA < varB) 
      {
        comparison = -1;
      }
      return ((order == 'desc') ? (comparison * -1) : comparison);
    }
  }

}
// End.