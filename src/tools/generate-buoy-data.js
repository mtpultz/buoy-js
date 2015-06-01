/*eslint-disable no-console */
import parseData from "../parse-latest-observation-data";
import existingData from "../data/buoys";
import request from "request";
import _ from "lodash";
import fs from "fs";
let match = /h1><p>(.*)<br/i;

function done(data) {
	data = JSON.stringify(data, null, 2);
	fs.writeFileSync("./src/data/buoys.json", data);
}
/**
 * For each buoy listed in latest_obs.txt,
 * create an object and store the buoy's latitude and longitude
 * then also find its name from the mobile site for station.php,
 * which is used because it was just easy to parse with regex
 */
request("http://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt", function(err, data) {
	if (err) {
		console.error("Error loading latest_obs", err);
	} else {
		let buoys = _.omit(parseData(data.body), _.keys(existingData)),
			result = existingData || {},
			finish = _.after(_.keys(buoys).length, done);
		_.each(buoys, function(buoy, key) {
			result[key] = {
				longitude: buoy.longitude,
				latitude: buoy.latitude
			}
		})
		console.log("load data for " +  _.keys(buoys).length + " buoys");
		_.each(_.keys(buoys), function(key) {
			request("http://www.ndbc.noaa.gov/mobile/station.php?station=" + key, function(stationErr, stationData) {
				if (err) {
					console.error("Error loading station " + key, err);
				} else {
					let parse = match.exec(stationData.body);
					// if there's no match, use this temporary default string
					if (!parse || parse.length < 2) {
						result[key].name = "Unnamed buoy #" + key;
					}else{
						result[key].name = parse[1];
					}
					console.log("Updated data for key:", result[key]);
					finish(result);
				}
			});
		});
	}
});
