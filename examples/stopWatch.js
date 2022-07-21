// const { readJSON, writeJSON } = await require('@bridge/fs')

let filePath = 'data/stopwatch.json'

export default {
	async mounted() {
		try {
			let data = await readJSON(filePath)
			Object.assign(this.$data, data)

			if (data.isRunning) {
				this.startTime()
			} else {
				this.formatTime()
			}
		} catch {}
	},
	data() {
		return {
			timer: null,
			msTime: 0,
			formattedTime: '00:00:00.00',
			isRunning: false,
			startTimestamp: null,
		}
	},
	methods: {
		onToggle() {
			if (this.isRunning) {
				this.isRunning = false
				this.pauseTime()
			} else {
				this.isRunning = true
				this.startTimestamp = Date.now() - this.msTime
				this.startTime()
			}
			this.writeData()
		},
		startTime() {
			this.timer = setInterval(() => {
				this.updateTime()
			}, 10)
		},
		pauseTime() {
			clearInterval(this.timer)
		},
		resetTime() {
			this.msTime = 0
			this.startTimestamp = Date.now()
			this.formatTime()
			this.writeData()
		},
		updateTime() {
			this.msTime = Date.now() - this.startTimestamp
			this.formatTime()
		},
		formatTime() {
			this.formattedTime = new Date(this.msTime)
				.toISOString()
				.slice(11, -2)
		},
		async writeData() {
			await writeJSON(filePath, this.$data)
		},
	},
}
