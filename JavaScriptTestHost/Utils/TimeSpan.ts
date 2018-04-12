export default class TimeSpan {
	public static StringToMS(timespan: string): number {
		let time = timespan.split(':');
		return (parseInt(time[0]) * 60 * 60
				+ parseInt(time[1]) * 60
				+ parseFloat(time[2])) * 1000;
	}

	public static MSToString(milliseconds: number) {
		let duration = milliseconds/1000;
		
		let s = duration % 60;
		duration = (duration - s)/60;
		let m = duration % 60;
		duration = (duration - m)/60;
		let h = duration % 60;
	
		let timespan = (h < 10 ? "0" + h : h) + ":" +
						(m < 10 ? "0" + m : m) + ":" +
						(String(s).length == 1 ? `0${s}` : `${s}`);					
	
		return timespan;
	}
}

function MSToString(milliseconds) {

}