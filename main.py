import sys
import hashlib, binascii, os
import uuid
from http import cookies
from configparser import ConfigParser
import pdb
import requests
import requests_cache
import datetime
import json
import sqlite3
from flask import Flask, render_template, request, jsonify, make_response, redirect, url_for, session


app = Flask(__name__)
#app.debug =True

requests_cache.install_cache('mopod_cache', backend='sqlite', expire_after=36000)
requests_cache.core.remove_expired_responses()

config = ConfigParser()
config.read("/home/pi/mopod/config.py")

DATABASE = config.get("config", "DATABASE")
LNKEY = config.get("config", "LNKEY")
#LNHEADERS = config.get("config", "LNHEADERS")
LNURL = config.get("config", "LNURL")

qLOGIN = config.get("sql", "qLOGIN")
qGENRE = config.get("sql", "qGENRE")
qINSLL = config.get("sql", "qINSLL")
qUPDLL = config.get("sql", "qINSLL")
qSELSUB = config.get("sql", "qSELSUB")
qSELLL = config.get("sql", "qSELLL")
qINSSUB = config.get("sql", "qINSSUB")
qUPDSUB = config.get("sql", "qUPDSUB")
qUPDSUB2 = config.get("sql", "qUPDSUB2")


@app.route('/', methods=['GET', 'POST'])
def index():

		call = "just_listen"
		 
		response = callListenNotes(call)
		 	
		result = response.json()

		result["pubDate"] = datetime.datetime.fromtimestamp(result["pub_date_ms"]//1000.0)
		result["episodeDescription"] = result["description"][:200] + '...'
		
		resp = make_response(render_template('index.html', result=result))
		return resp



@app.route("/login", methods=['POST'])
def login():
		username = request.form['username']
		password = request.form['password']
		error = None
		#pdb.set_trace()
		try:
				query = "SELECT password from users WHERE username = ?"
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()	
				cursor.execute(query, (username,))
				storedPassword = cursor.fetchone()
				#pdb.set_trace()
				print(verifyPassword(storedPassword[0], password))

		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()

		return (error, 204) 



def hashPassword(password):
    pdb.set_trace()
    salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
    pwdHash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 100000)
    pwdHash = binascii.hexlify(pwdHash)
    return (salt + pwdHash).decode('ascii')
    
    
    
def verifyPassword(storedPassword, providedPassword):
		pdb.set_trace()
		salt = storedPassword[:64]
		storedPassword = storedPassword[64:]
		pwdHash = hashlib.pbkdf2_hmac('sha512', providedPassword.encode('utf-8'), salt.encode('ascii'), 100000)
		pwdHash = binascii.hexlify(pwdHash).decode('ascii')
		return pwdHash == storedPassword
    
    

@app.route("/newuser", methods=['GET'])
def newUser():
		email = request.args.get('email')
		username = request.args.get('username')
		password = request.args.get('password')
		
		pwdHashed = hashPassword(password)
		
		try:
				query = "INSERT INTO users (email, username, password, timestamp) VALUES (?, ?, ?, DATE())"
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()	
				cursor.execute(query, (email, username, pwdHashed))
				conn.commit()
				
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				
		return ('', 204)
	
	        
def callListenNotes(call):
		headers = { 'X-ListenAPI-Key': LNKEY }
		url = LNURL + call		
		response = requests.request('GET', url, headers=headers)
		print(response.from_cache)
		return response



def callListenNotes_POST(call, data):
		headers = { 'X-ListenAPI-Key': LNKEY }
		
		url = "https://listen-api.listennotes.com/api/v2/" + call
		
		data = { 'show_latest_episodes': '0', 'ids' : data }
		
		response = requests.request('POST', url, headers=headers, data=data)
		
		#print(response.from_cache)
		return response


@app.route('/spinRoulette')
def spinRoulette():
		# Disabling cache on this call because the whole point is to be a random choice each load.
		with requests_cache.disabled():
				headers = { 'X-ListenAPI-Key': LNKEY }
				url = LNURL + "just_listen"		
				response = requests.request('GET', url, headers=headers)
				#print(response.from_cache)
				return response.text



@app.route('/search', methods=['GET', 'POST'])
def search():
		query = request.args.get('query')
		type = request.args.get('type')
		genreId = request.args.get('genreid')
		offset = request.args.get('offset')
		call = "search?q=" + query + "&type=" + type + "&sort_by_date=1" + "&genre_ids=" + genreId + "&offset=" + offset
		response = callListenNotes(call)		
		return response.text
		
		

def getListenNotesData(call):
		response = callListenNotes(call)
		return response.text
		
def getPodcast(id):
		call = "podcasts/" + id
		response = callListenNotes(call)
		return response.text	

@app.route('/getEpisode', methods=['GET', 'POST'])	
def getEpisode():
		id = request.args.get('id')
		call = "episodes/" + id
		response = callListenNotes(call)
		return response.text	



@app.route('/getGenres', methods=['GET', 'POST'])	
def getGenres():
		genres = []
		query = qGENRE
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()
				cursor.execute(query)

				rows = cursor.fetchall()

				if rows != None:
						for row in rows:
								genres.append(row)
						return json.dumps(genres)
				else:
						return ('', 204)

		except sqlite3.Error as err:
				print("This is the error: " + err)

		finally:
				cursor.close()
				conn.close()



# Subscription functions.
@app.route('/getSubscriptions', methods=['GET', 'POST'])		
def getSubscriptions():
	
		podcastIDs = ""
		counter = 0
		offset = 10
		query = qSELSUB
		subscriptions = []
		podcasts = ""
		subs = list()

		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()
				cursor.execute(query)

				rows = cursor.fetchall()
				rows2 = rows

				for row in rows:						
						podcastIDs += row[0] + ","
						counter += 1

						# Using modulus to loop through every ten results. Modulus will need to equal zero.
						pointer = (counter + offset) % offset

						# Parse through each batch of ten and push into subscription object array. This will avoid arrayed groups of responses.
						if pointer == 0 or counter >= len(rows):

								podcasts = callListenNotes_POST("podcasts/", podcastIDs)				

								#subscriptions.append(json.loads(podcasts.text))				
								
								pcTemp = json.loads(podcasts.text)
								
								subscriptions.extend(pcTemp.get("podcasts"))
								
								podcastIDs = ""

								#pdb.set_trace()

				# Now loop through and add in lastEpisodeMs
				for subscription in subscriptions:
						for row2 in rows2:
								#pdb.set_trace()
								if subscription["id"] == row2[0]:
										subscription["latestMopodMs"] = row2[1]
										if subscription["latest_pub_date_ms"] > subscription["latestMopodMs"]:
												subscription["hasListened"] = 0
										else:
												subscription["hasListened"] = row2[2]
												
						#pdb.set_trace()
						subs.append(subscription)

				#pdb.set_trace()			
				
				return json.dumps(subs)
						
		except sqlite3.Error as err:
				print(err)
				return ('', 204)
				
		finally:
				cursor.close()
				conn.close()


@app.route('/getSubscription', methods=['GET', 'POST'])		
def getSubscription():
		id = request.args.get('id')
		podcast = getPodcast(id)
		subscription = json.loads(podcast)
		return json.dumps(subscription)


@app.route('/insertSubscription', methods=['GET', 'POST'])
def insertSubscription():
		id = request.args.get('id')
		podcast = dict()
		
		if id != "undefined":
				# string
				#podcast = getPodcast(id)
				# dict
				# Need to call for the podcast singlely in order to get the last episode date. This isn't in the POST response.
				podcast = json.loads(getPodcast(id))
				# dict_keys(['id', 'title', 'publisher', 'image', 'thumbnail', 'listennotes_url', 'total_episodes', 'explicit_content', 'description', 'itunes_id', 'rss', 'latest_pub_date_ms', 'earliest_pub_date_ms', 'language', 'country', 'website', 'extra', 'is_claimed', 'email', 'looking_for', 'genre_ids', 'episodes', 'next_episode_pub_date'])
				#pdb.set_trace()
				ms = podcast.get("latest_pub_date_ms")
				
				query = qINSSUB
				
				try:
						conn = sqlite3.connect(DATABASE)
						cursor = conn.cursor()				
						cursor.execute(query, (0, id, 1, ms, 0))
						conn.commit()
						
				except sqlite3.Error as err:
						print(err)
						
				finally:
						cursor.close()
						conn.close()
						
						podcast["latestMopodMs"] = ms
						podcast["hasListened"] = 0
						
						return json.dumps(podcast)


# 10 ids per call.
@app.route('/postSubscriptions', methods=['GET', 'POST'])		
def postSubscriptions():
	
		subscriptions = []
		
		query = qSELSUB
		
		ids = ""
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()
				cursor.execute(query)
				
				rows = cursor.fetchall()

				for row in rows:
						ids += row[0] + ","
				
				response = postToListenNotes("podcasts", ids)

				print(response.text)
						
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				return ('', 204)
		
		
			
@app.route('/deleteSubscription', methods=['GET', 'POST'])		
def deleteSubscription():
		id = request.args.get('id')
		query = qUPDSUB
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()				
				cursor.execute(query, (0, id))
				conn.commit()
				
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				return ('', 204)
# End subscription functions.
#


#
# Later List functions.
@app.route('/getLaterList')		
def getLaterList():
		laterList = []
		query = qSELLL
		episodeIDs = ""
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()
				cursor.execute(query)
				
				rows = cursor.fetchall()
				
				for row in rows:
						episodeIDs += row[0] + ","
				
				episodes = callListenNotes_POST("episodes/", episodeIDs)
				
				laterList = json.loads(episodes.text)
				return json.dumps(laterList)
				
		except sqlite3.Error as err:
				print(err)
				return ('', 204)
				
		finally:
				cursor.close()
				conn.close()


@app.route('/_getLaterList')		
def _getLaterList():
		laterList = []
		query = qSELLL
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()
				cursor.execute(query)
				
				rows = cursor.fetchall()
				
				for row in rows:
						episode = getListenNotesData("episodes/" + row[0])
						
						episodeJSON = json.loads(episode)
						
						laterList.append(episodeJSON)
				
				return json.dumps(laterList)
				
		except sqlite3.Error as err:
				print(err)
				return ('', 204)
				
		finally:
				cursor.close()
				conn.close()


@app.route('/insertLaterList', methods=['GET', 'POST'])		
def insertLaterList():
		episodeId = request.args.get('episodeid')
		query = qINSLL
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()				
				cursor.execute(query, (0, episodeId, 1))
				conn.commit()
				
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				return ('', 204)


@app.route('/deleteLaterList', methods=['GET', 'POST'])		
def deleteLaterList():
		episodeId = request.args.get('episodeid')
		query = qUPDLL
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()				
				cursor.execute(query, (0, episodeId,))
				conn.commit()
				
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				return ('', 204)
# End Later List functions.
#


#
# Helper functions.
@app.route('/hasListened', methods=['GET', 'POST'])		
def hasListened():
		id = request.args.get('id')
		ms = request.args.get('ms')
		query = qUPDSUB2
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()				
				cursor.execute(query, (ms, 0, id))
				conn.commit()
				
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				return ('', 204)


@app.route('/getRecos', methods=['GET', 'POST'])
def getRecos():

		id = request.args.get('id')
		call = "/podcasts/" + id + "/recommendations"
		#pdb.set_trace()
		recos = callListenNotes(call)
		recos = json.loads(recos.text)		
		return json.dumps(recos)


@app.route('/getNewEpisodeFlags', methods=['GET', 'POST'])		
def getNewEpisodeFlags():
	
		query = qSELSUB
		latestEps = list()
	
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()
				cursor.execute(query)
				
				rows = cursor.fetchall()
				
				for row in rows:
						temp = { "podcastID":row[0], "latestEpisodeMs":row[1]}
						latestEps.append(temp)
				#pdb.set_trace()			
				
				return json.dumps(latestEps)
						
		except sqlite3.Error as err:
				print(err)
				return ('', 204)
				
		finally:
				cursor.close()
				conn.close()



# End helper function.
#


if __name__ == '__main__':
   	app.run(host='0.0.0.0')