import sys
from passlib.hash import sha256_crypt 
import uuid
from http import cookies
from configparser import ConfigParser
import pdb; 
import requests
import requests_cache
import datetime
import json
import sqlite3
from flask import Flask, render_template, request, jsonify, make_response


app = Flask(__name__)
#app.debug =True

requests_cache.install_cache('mopod_cache', backend='sqlite', expire_after=36000)
requests_cache.core.remove_expired_responses()

config = ConfigParser()
config.read("/home/pi/mopod/config.py")

DATABASE = config.get("config", "DATABASE")
LNKEY = config.get("config", "LNKEY")

qLOGIN = config.get("sql", "qLOGIN")
qGENRE = config.get("sql", "qGENRE")
qINSLL = config.get("sql", "qINSLL")
qUPDLL = config.get("sql", "qINSLL")
qSELSUB = config.get("sql", "qSELSUB")
qSELLL = config.get("sql", "qSELLL")
qINSSUB = config.get("sql", "qINSSUB")
qUPDSUB = config.get("sql", "qUPDSUB")


@app.route('/', methods=['GET', 'POST'])
def index():

		call = "just_listen"
		 
		response = callListenNotes(call)
		 	
		result = response.json()

		result["pubDate"] = datetime.datetime.fromtimestamp(result["pub_date_ms"]//1000.0)
		result["episodeDescription"] = result["description"][:200] + '...'
		
		resp = make_response(render_template('index.html', result=result))
		return resp



@app.route('/login', methods=['GET', 'POST'])
def login():	

		sessionId = str(uuid.uuid4())
		
		query = qLOGIN
		
		userId = 0

		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()				
				cursor.execute(query, (sessionId, userId))
				conn.commit()
				
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				
				resp = make_response(render_template('login.html'))
				resp.set_cookie('sessionid', sessionId)
				return resp


def callListenNotes(call):
		headers = { 
			'X-ListenAPI-Key': LNKEY
		}
		
		url = "https://listen-api.listennotes.com/api/v2/" + call
		
		response = requests.request('GET', url, headers=headers)
		print(response.from_cache)
		return response
		


def callListenNotes_POST(call, data):
		headers = { 'X-ListenAPI-Key': LNKEY }
		
		url = "https://listen-api.listennotes.com/api/v2/" + call
		
		data = { 'show_latest_episodes': '0', 'ids' : data }
		
		response = requests.request('POST', url, headers=headers, data=data)
		
		print(response.from_cache)
		return response
		


@app.route('/spinRoulette')
def spinRoulette():
		response = callListenNotes("just_listen")
		return response.text



@app.route('/search', methods=['GET', 'POST'])
def search():
		query = request.args.get('query')
		type = request.args.get('type')
		genreId = request.args.get('genreId')
		call = "search?q=" + query + "&type=" + type + "&sort_by_date=1" + "&genre_ids=" + genreId
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
				

@app.route('/getSubscriptions', methods=['GET', 'POST'])		
def getSubscriptions():
	
		podcastIDs = ""
		counter = 0
		offset = 10
		query = qSELSUB
		subscriptions = []
		podcasts = ""
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()
				cursor.execute(query)
				
				rows = cursor.fetchall()

				for row in rows:						
						podcastIDs += row[0] + ","
						counter += 1
						
						# Using modulus to loop through every ten results. Modulus will need to equal zero.
						pointer = (counter + offset) % offset
						
						if pointer == 0 or counter >= len(rows):
								podcasts = callListenNotes_POST("podcasts/", podcastIDs)								
								subscriptions.append(json.loads(podcasts.text))				
								
								#pdb.set_trace()
								podcastIDs = ""
						
				return json.dumps(subscriptions)
						
		except sqlite3.Error as err:
				print(err)
				return ('', 204)
				
		finally:
				cursor.close()
				conn.close()
				
				
				
@app.route('/getSubscription', methods=['GET', 'POST'])		
def getSubscription():
		
		podcastID = request.args.get('podcastID')
		
		podcast = getListenNotesData("podcasts/" + podcastID)
						
		subscription = json.loads(podcast)
				
		return json.dumps(subscription)
						
				
				
				
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
		
		
		

@app.route('/insertSubscription', methods=['GET', 'POST'])
def insertSubscription():
		
		id = request.args.get('id')
		
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
						cursor.execute(query, (0, id, 1, ms))
						conn.commit()
								
						return podcast
						
				except sqlite3.Error as err:
						print(err)
						
				finally:
						cursor.close()
						conn.close()
			
				
				
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
		podcastId = request.args.get('podcastid')
		query = qUPDSUB
		
		try:
				conn = sqlite3.connect(DATABASE)
				cursor = conn.cursor()				
				cursor.execute(query, (0, podcastId))
				conn.commit()
				
		except sqlite3.Error as err:
				print(err)
				
		finally:
				cursor.close()
				conn.close()
				return ('', 204)
			
			
			
			
			
if __name__ == '__main__':
   	app.run(host='0.0.0.0')