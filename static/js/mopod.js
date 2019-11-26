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
  jObj_subscription: {},
  jObj_subscriptions: {},
  jObj_laterList: {},
  jObj_newEpisodeFlags: {},


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
  
  
  
  // Account login.
  login: function()
  {
	  let reqObj = {};
	  let reqUrl = "";
	  
	  // Create HTTP request object.
    reqObj = new XMLHttpRequest();
    // Construct the webservice URL.
    reqUrl = "/login";   
    // Set up the POST request.
    let params = "username=" + document.getElementById("username").value + "&password=" + document.getElementById("password").value;
    reqObj.open("POST", reqUrl, true);  
    reqObj.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");  
    // Send request. Parameters are in URL.
    reqObj.send(params);    
    // Upon successful webservice return...
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
	      document.getElementById("accountResults").innerHTML = reqObj.response;
			}
		}
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
        
        payload += "<span>Category:</span>";
        payload += "<select id=\"genreDropdown\">";
        payload += "  <option value=\"all\">ALL</option>";
        
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
        payload += "    <div class=\"col-12 col-lg-4\">";
        payload += "      <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" />";
        //payload += "      <audio controls><source src=\"" + jObj.audio + "\" /></audio>";
        payload += "    </div>";
        payload += "    <div class=\"col-12 col-lg-4\">";
        payload += "      <h1 class=\"podcastTitle\">" + jObj.podcast_title + "</h1>";
        payload += "      <p class=\"publisher\">" + jObj.publisher + "</p>";
        payload += "      <h2 class=\"episodeTitle\"><a class=\"playerIcon\" href=\"javascript: mopod.play('" + jObj.id + "');\">" + jObj.title + "</a></h2>";
        payload += "      <p class=\"pubDate\">" + pubDate + "</p>";
        payload += "      <p class=\"episodeDescription\">" + jObj.description + "</p>";
        payload += "    </div>";
        payload += "    <div class=\"col-12 col-lg-4\">";
        payload += "    </div>";
        payload += "  </div>";
 
        document.getElementById("rouletteResult").innerHTML = payload;
        
        document.getElementById("rouletteResult").setAttribute("data-episodeid", jObj.id);
        document.getElementById("rouletteResult").setAttribute("data-podcastid", jObj.podcast_id);
      }
    }
  },
  
  
  // Search for podcasts or specific episodes within user-selected category.
  search: function(offset)
  {
    let payload = "";
    let pubDate = "";
    let reqObj, reqUrl, jObj;
    let searchType = "";
    let genreID = "";
    let query = "";
    let result = {};
    
    document.getElementById("searchResults").innerHTML = "<img src=\"/static/img/loading.gif\" width=\"50\" />";
    
    // Check if user wants overall podcast or specific episodes.
    let searchTypes = document.getElementsByName("searchType");
    for(let j = 0; j < searchTypes.length; j++)
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
    genreID = genres[genres.selectedIndex].value;
    if(genreID === "")
    {
      alert("Please choose a category.");
      return false;
    } 
    
    // Create HTTP request object.
    reqObj = new XMLHttpRequest();
    // Construct the webservice URL.
    // Save search string to use for additional results.
    query = document.getElementById("searchInput").value + "&type=" + searchType + "&genreid=" + genreID+ "&offset=" + offset;

    reqUrl = "/search?query=" + query;  
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
          for(let i = 0; i < jObj.count; i++)
          {            
	          result = jObj.results[i];
            payload += "<div class=\"col-6 col-lg-2 searchResult\" data-episodeid=\"" + null + "\" data-podcastid=\"" + result.id + "\" data-latestms=\"" + result.latest_pub_date_ms + "\">";
            payload += "<button onclick=\"mopod.insertSubscription();\">Subscribe</button>";
            payload += "<img class=\"img-fluid\" src=\"" + result.thumbnail + "\" title=\"" + result.description_original + "\"/>";
            payload += "<button class=\"play\" onclick=\"javascript: mopod.playSubscription();\">Open in Player</button>";
            if(searchType === "episode")
            {
              payload += "<button onclick=\"mopod.laterList('" + result.id + "');\">Save for Later</button>";
            }
            payload += "<h2 class=\"podcastTitle\">" + result.title_original + "</h2>";
            payload += "<p class=\"publisher\">" + result.publisher_original + "</p>";

            if(searchType === "episode")
            {
	            pubDate = new Date(result.pub_date_ms);
	            payload += "<h2 class=\"episodeTitle\">";
              payload += "<a class=\"playerIcon\" href=\"javascript: mopod.play('" + result.id + "');\">";
							payload += result.title_original;
              payload += "</a>";        
	            payload += "</h2>";
	            payload += "<p class=\"pubDate\">" + pubDate + "</p>";
	          }
            payload += "</div>";
          }
        }
        else
        {
          payload += "No results.";
        }
        
        payload += "</div>";
        
        document.getElementById("searchResults").innerHTML = payload;
        
        if(jObj.next_offset < jObj.total)
        {
	        document.getElementById("nextResultSet").innerHTML = "<p>" + jObj.total + " total results. <a href=\"javascript: mopod.search(" + jObj.next_offset + ");\">Next page (" + jObj.next_offset/10 + " of " + Math.ceil(jObj.total/10) + ")</a> ></p><br>";
        }
        else
        {
	        document.getElementById("nextResultSet").innerHTML = "End of results<br><br>";
        }
                
      }
    }   
  },
  
  
  // The subscription functions.
  // Query db for IDs for user and then call API for complete details.
  getSubscriptionsFromAPI: function()
  {
	  let payload = "";
	  let jObj = {};
	  let newCounter = 0;
	    
	  // Test if object already in memory. If so, don't make API call again.
	  if(mopod.jObj_subscriptions.length === undefined)
	  {
		  console.log("calling API");
	    let reqObj = new XMLHttpRequest();
	    let reqUrl = "/getSubscriptions";
	    
	    document.getElementById("subscriptionResults").innerHTML = "<img src=\"/static/img/loading.gif\" width=\"50\" />";
	    
	    reqObj.open("GET", reqUrl, true);
	    reqObj.send();
	
	    reqObj.onreadystatechange = function()
	    {
	      if(reqObj.readyState === 4)
	      {
	        mopod.jObj_subscriptions = JSON.parse(reqObj.response);
	        jObj = mopod.jObj_subscriptions;
	        
	        payload += "  <div class=\"col-12\"><p>" + jObj.length + " subscriptions. <span id=\"newCounter\"></span></p></div>";         
			    payload += "  <div class=\"col-12\">";
			    payload += "    <button onclick=\"mopod.reloadSubscriptions();\">Refresh</button>";
			    payload += "  </div>";
    
	        // Put "The " to the end.
	        mopod.theToTheEnd();
	        // Sort according to title. To do: put in a sort picker.
	        jObj = mopod.jObj_subscriptions.sort(mopod.compareValues("title", "asc"));		
					
	        for(let i = 0; i < jObj.length; i++)
	        {
			      payload += mopod.getSubscriptionHTML(jObj[i]);
			      if(jObj[i].hasListened === 0)
			      {
				      newCounter++;
			      }
		      }
	                 
		      if(payload !== "")
		      {
		        document.getElementById("subscriptionResults").innerHTML = payload;
		        document.getElementById("newCounter").innerHTML = newCounter + " with new episodes.";
		      }
		      else
		      { 
		        document.getElementById("subscriptionResults").innerHTML = "Add subscriptions in the Roulette or Search panels.";
		      }      
	      }
		  }
		}
		// Use cached object.
    else
    {
	    console.log("in memory");
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

        podcast = mopod.getSubscriptionHTML(jObj);
        document.getElementById("subscriptionResults").insertAdjacentHTML("afterbegin", podcast);
        document.getElementById("subscriptionResults").getElementsByTagName("div")[0].getElementsByTagName("span")[0].classList.add("active")
      }
    }
  },
  // Delete from db and also from DOM and jObj.
  deleteSubscription: function()
  {
    let reqObj = {};
    let reqUrl = "";
    let podcast = "";
		let id = event.currentTarget.offsetParent.dataset.podcastid;
		
    // Remove from db.
    reqObj = new XMLHttpRequest();
    reqUrl = "/deleteSubscription?id=" + id;   
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
    let flag = 0;
    
    // See if there is a new episode.
    if(jObj.latest_pub_date_ms >= jObj.latestMopodMs && jObj.hasListened === 0)
    {
	    flag = 1;
    }
    payload += "<div class=\"col-6 col-lg-2 podcast\" data-podcastid=\"" + jObj.id + "\" data-latestms=\"" + jObj.latest_pub_date_ms + "\" data-latestmopodms=\"" + jObj.latestMopodMs + "\" data-haslistened=\"" + jObj.hasListened + "\">";
    payload += "  <button class=\"remove\" onclick=\"javascript:mopod.deleteSubscription()\">Unsubscribe</button>";
    payload += "  <span class=\"newEpisode" + ( flag === 1 ? " new" : "") + "\"></span>";
    payload += "  <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" title=\"" + jObj.description + "\" />";
    payload += "  <button class=\"play\" onclick=\"javascript: mopod.playSubscription();\">Open in Player</button>";
    payload += "  <h2 class=\"podcastTitle\">" + jObj.title + "</h2>";
    payload += "    <p class=\"publisher\">" + jObj.publisher + "</p>";
    payload += "  <div class=\"episodes\">";
    
    payload += "  </div>";
    payload += "</div>";

    return payload;
  },
  // Reload just the subscriptions.
  reloadSubscriptions: function()
  {
	  mopod.getSubscriptionsFromAPI();
	  
  },
  //
  playSubscription: function()
  {
    let pubDate = "";
    let payload = "";
    let jObj = {};
    let id = event.currentTarget.offsetParent.dataset.podcastid;
    let mopodMs = event.currentTarget.offsetParent.dataset.latestmopodms;
    let hasListened = event.currentTarget.offsetParent.dataset.haslistened;
    let episodes = [];

    let reqObj, reqUrl;
    reqObj = new XMLHttpRequest();
    reqUrl = "/getSubscription?id=" + id;   
    reqObj.open("GET", reqUrl, true);    
    reqObj.send();
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        jObj = JSON.parse(reqObj.response);
        mopod.jObj_subscription = jObj;
        
        for(let i = 0; i < jObj.length; i++)
        {
          if(jObj[i].id === id)
          {
            jObj = jObj[i];
          }
        }  
        
        payload += "  <div class=\"row\">";
        payload += "    <div class=\"col-12 col-lg-4\" data-podcastid=\"" + jObj.id + "\">";
        payload += "      <button class=\"remove\" onclick=\"javascript:mopod.deleteSubscription()\">Unsubscribe</button>";
        payload += "      <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" /><br><br>";
        payload += "      <div id=\"audioControls\">";
        payload += "        <audio id=\"mainPlayerAudio\" src=\"" + jObj.episodes[0].audio + "\" controls data-podcastid=\"" + jObj.id + "\" data-episodeid=\"" + jObj.episodes[0].id + "\" data-ms=\"" + jObj.episodes[0].pub_date_ms + "\" data-latestmopodms=\"" + mopodMs + "\" data-haslistened=\"" + hasListened + "\" onplay=\"javascript: mopod.hasListened();\">";
        payload += "        </audio>";
        payload += "        <img src=\"/static/img/icon_rewind.png\" onclick=\"javascript: mopod.rewind();\" />";
        payload += "        <img src=\"/static/img/icon_forward.png\" onclick=\"javascript: mopod.forward();\" />";
        payload += "      </div>";
        payload += "      <h2 class=\"episodeTitle\">" + jObj.episodes[0].title + "</h2>";
        payload += "      <p class=\"pubDate\">" + new Date(jObj.episodes[0].pub_date_ms) + "</p>";
        payload += "      <p class=\"description\">" + jObj.episodes[0].description + "</p>";
        payload += "    </div>";
        payload += "    <div class=\"col-12 col-lg-4\">";
        payload += "      <h1 class=\"podcastTitle\">" + jObj.title + "</h1>";
        payload += "      <p class=\"publisher\">" + jObj.publisher + "</p>";
        payload += "      <p class=\"description\">" + jObj.description + "</p>";
        payload += "      <p>MOST RECENT EPISODES</p>";
        payload += "      <ol id=\"playerEpisodes\">";
        
        for(let j = 0; j < jObj.episodes.length; j++)
        {
          payload += "      <li " + (j === 0 ? "class=\"active\"" : "") + " data-episodeid=\"" + jObj.episodes[j].id + "\">" + jObj.episodes[j].title + "</li>";
        }
        
        payload += "      </ol>";               
        payload += "    </div>";                
        payload += "    <div class=\"col-12 col-lg-4 ad\">";
        payload += "      <h2>You may also like...</h2>";
        payload += "      <div id=\"recos\"></div>";
        payload += "    </div>";
        payload += "  </div>";

        document.getElementById("playerResult").innerHTML = payload;
        
        episodes = document.getElementById("playerEpisodes").getElementsByTagName("li");
        
        for(let k = 0; k < episodes.length; k++)
        {
          episodes[k].addEventListener("click", mopod.playSubscriptionEpisode);
        }
        
        // Add listener to audio tag to update db if user listens to latest episode.
        mainPlayerAudio = document.getElementById("mainPlayerAudio");
        mainPlayerAudio.addEventListener("click", mopod.hasListened);

        mopod.getRecos(id);

        // Set focus on tab.
        mopod.openTab(null, "player");
        document.getElementsByClassName("tabLinks")[0].className += " active";
        window.scrollTo(0,0);
      }
    }
  },
  
  
  
  // Swap in other episodes.
  playSubscriptionEpisode: function()
  {
    let id = event.currentTarget.dataset.episodeid;
    let episodes = mopod.jObj_subscription.episodes;
    let player = document.getElementById("playerResult");
    let audio = document.getElementById("mainPlayerAudio");
    let lis = document.getElementById("playerEpisodes").getElementsByTagName("li");
    
    for(let i = 0; i < episodes.length; i++)
    {
      if(episodes[i].id === id)
      {
        audio.src = episodes[i].audio;
        document.getElementById("mainPlayerAudio").load();
        player.getElementsByClassName("episodeTitle")[0].innerHTML = episodes[i].title;
        player.getElementsByClassName("pubDate")[0].innerHTML = new Date(episodes[i].pub_date_ms);
        player.getElementsByClassName("description")[0].innerHTML = episodes[i].description;
        audio.removeAttribute("data-ms");
        audio.removeAttribute("data-latestmopodms");
        audio.removeAttribute("data-haslistened");
        audio.removeAttribute("onplay");
        audio.setAttribute("data-episodeid", id);
        
        
        for(let j = 0; j < lis.length; j++)
        {
          lis[j].classList.remove("active");
          if(lis[j].dataset.episodeid === id)
          {
            lis[j].classList.add("active");
          }
        }
      }
    }
    //audio.play();
  },
  // Get recommendations based on current podcast.
  getRecos: function(id)
  {
    // Get You May Also Like podcasts.
    let payload = "";
    let reqObj, reqUrl;
    
    reqObj = new XMLHttpRequest();
    reqUrl = "/getRecos?id=" + id;   
    reqObj.open("GET", reqUrl, true);    
    reqObj.send();
    
    reqObj.onreadystatechange = function()
    {
      if(reqObj.readyState === 4)
      {
        jObj = JSON.parse(reqObj.response);
				
				for(let i = 0; i < jObj.recommendations.length; i++)
				{
					payload += mopod.getRecoHTML(jObj.recommendations[i]);
      	}
      	
      	document.getElementById("recos").innerHTML = payload;
    	}
    }
  },
  
  // Get recommendations based on current podcast.
  getRecoHTML: function(jObj)
  {
    let payload = "";
    
    //payload += "<div class=\"row reco\">";
    payload += " <div class=\"col-3\" data-podcastid=\"" + jObj.id + "\">";
    payload += "  <button class=\"play\" onclick=\"javascript: mopod.insertSubscription();\">Subscribe</button>";
    payload += "  <img class=\"img-fluid\" src=\"" + jObj.thumbnail + "\" title=\"" + jObj.description + "\" />";
    payload += "  <button class=\"play\" onclick=\"javascript: mopod.playSubscription();\">Open in Player</button>";
    payload += " </div>";
    payload += " <div class=\"col-3\">";
    payload += "  <h2 class=\"podcastTitle\">" + jObj.title + "</h2>";
    payload += "  <p class=\"publisher\">" + jObj.publisher + "</p>";
    payload += " </div>";
    //payload += "</div>";
    
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
    window.scrollTo(0,0);
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
  
	// Move "The" to the end for sorting purposes.
	theToTheEnd: function()
	{
		let podcasts = mopod.jObj_subscriptions;
		let title = "";
		let titleThe = "";
		let titleRest = "";
		
		for(let i = 0; i < podcasts.length; i++)
		{
			title = podcasts[i].title;
			if(title.indexOf("The ") === 0)
			{
				titleThe = title.slice(0,4);
				titleRest = title.slice(4);
				mopod.jObj_subscriptions[i].title = titleRest + ", The";	
			}
			
		}
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
      return ((order == 'asc') ? (comparison * -1) : comparison);
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
  },
  
  
  // Update db if user has listened to the latest episode.
  hasListened: function()
  {
	  let mainAudio = document.getElementById("mainPlayerAudio");
	  let ms = mainAudio.dataset.ms;
	  let id = mainAudio.dataset.podcastid;
	  
	  if(ms >= mainAudio.dataset.latestmopodms && mainAudio.dataset.haslistened === "0")
	  {
	    // Remove from db.
	    reqObj = new XMLHttpRequest();
	    reqUrl = "/hasListened?id=" + id + "&ms=" + ms;   
	    reqObj.open("GET", reqUrl, true);    
	    reqObj.send();
	    
	    // Update Subscription page without reloading.
	    let subs = document.getElementById("subscriptionResults").getElementsByClassName("podcast");
	    for(let i = 0; i < subs.length; i++)
	    {
		    if(subs[i].dataset.podcastid === id)
		    {
			    subs[i].getElementsByTagName("span")[0].classList.remove("new");
		    }
	    }
	    
	  }
  }

}
// End.