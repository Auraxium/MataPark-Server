
import time, json
import requests
from bs4 import BeautifulSoup

global data
data = {
    'lots': [],
    'date': 0
}

def parkingUpdate():
    try:

        url = "https://m.csun.edu/alumni_community/find_parking/index"
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')

        query = []
        rows = soup.select("tr.kgoui_object.kgoui_table_table_row")
        for row in rows:
            lot = row.select_one(
                ":first-child div a div .kgo-title :first-child strong").text
            slots = row.select_one(
                ":nth-child(2) div a div .kgo-title :first-child span").text
            query.append({"lot": lot, "slots": slots})

        # data['date'] = int(time.time() * 1000)

        print(json.dumps({"lots": query, "now": int(time.time() * 1000)}))

    except Exception as err:
        print(err)

parkingUpdate()