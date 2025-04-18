<template>
     <div class="page">
    <h2 class="page-title">Real-Time CPU Monitoring</h2>
    <div class="dashboard">
        <form @submit.prevent="fetchCpuData">
            <label>IP Address:
                <input v-model="ip"/>
            </label>

            <label>Time Period:
                <select v-model="timePeriod">
                    <option value="lastHour">Last Hour</option>
                    <option value="last6Hours">Last 6 Hours</option>
                    <option value="lastDay">Last Day</option>
                    <option value="lastWeek">Last Week</option>
                </select>
            </label>

            <label>Interval (seconds):
                <select v-model="interval" required>
                    <option 
                        v-for="value in validIntervals" 
                        :key="value" 
                        :value="value">
                        {{ value }}
                    </option>
                </select>
            </label>
            <br/>

            <button type="submit">Load</button>
            
        </form>
    </div>

    <canvas ref="chartCanvas" width="600" height="300" style="border: 1px solid gray;"></canvas>
</div>
</template>

<script setup>
    import Chart from 'chart.js/auto'
    import { ref, computed, watch } from 'vue'
    const chartCanvas = ref(null)
    let chartInstance = null

    const ip = ref('172.31.88.161')
    const timePeriod = ref('lastHour')
    const interval = ref(300)

    const validIntervals = computed(() => {
        return validPeriodsByTimeRange[timePeriod.value] || []
    })

    const validPeriodsByTimeRange = {
        lastHour:    [60, 300, 900, 3600],
        last6Hours:  [300, 900, 3600],
        lastDay:     [900, 3600, 21600],
        lastWeek:    [3600, 21600, 86400]
    } 
    const fetchCpuData = async () => {
    const now = new Date()
    let startTimeCalc = new Date()


    if (!ip.value || !interval.value || !timePeriod.value) {
        alert("Please fill out all required fields.")
        return
    }
    if (timePeriod.value === 'lastHour') {
        startTimeCalc.setHours(now.getHours() - 1)
    } else if (timePeriod.value === 'last6Hours') {
        startTimeCalc.setHours(now.getHours() - 6)
    } else if (timePeriod.value === 'lastDay') {
        startTimeCalc.setDate(now.getDate() - 1)
    } else if (timePeriod.value === 'lastWeek') {
        startTimeCalc.setDate(now.getDate() - 7)
    }

    watch(timePeriod, () => {
        const valid = validPeriodsByTimeRange[timePeriod.value]
        if (valid && valid.length > 0) {
            interval.value = valid[0]
        }
    })

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

    const res = await fetch(`${backendUrl}/cpu?ip=${ip.value}&startTime=${startTimeCalc.toISOString()}&endTime=${now.toISOString()}&interval=${interval.value}`);
    const data = await res.json()

    let labels = []
    let values = []
    

    if (data.Datapoints && Array.isArray(data.Datapoints)) {
        const datapoints = data.Datapoints.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))
        if (['lastHour', 'last6Hours'].includes(timePeriod.value)) {
    labels = datapoints.map(dp =>
      new Date(dp.Timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  } else {
    labels = datapoints.map(dp =>
      new Date(dp.Timestamp).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '')
    )
  }
        values = datapoints.map(dp => dp.Average)
    } else {
        alert('No datapoints found. Try a different time range or IP.')
        return
    }


    if (chartInstance) {
        chartInstance.destroy()
    }
    const ctx = chartCanvas.value.getContext('2d')

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
            label: 'CPU Usage (%)',
            data: values,
            borderColor: '#4a90e2',
            backgroundColor: 'rgba(74, 144, 226, 0.2)',
            pointRadius: 4,
            pointHoverRadius: 6,
            }]
        },
        options: {
            scales: {
            x: {
                title: {
                display: true,
                text: 'Time',
                }
            },
            y: {
                title: {
                display: true,
                text: 'CPU Usage (%)',
                },
            }
            }
        }
    })
    }

</script>

<style scoped>

    .page {
    max-width: 700px;  
    margin: 0 auto;
    background: linear-gradient(to right, #f5f7fa, #e3edf7);
    padding: 30px;
    border-radius: 16px;
    }

    .page-title {
    text-align: center;
    font-size: 32px;
    margin-top: 20px;
    margin-bottom: 40px;
    color: #4a4a4a;
    font-weight: 700;
    font-family: 'Segoe UI', sans-serif;
    letter-spacing: 0.5px;
    }

    .dashboard {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 30px;
    }

    form {
    background-color: white;
    padding: 25px 30px;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    width: 480px;
    margin-bottom: 40px;
    }

    label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
    color: #333;
    }

    input,
    select {
    padding: 10px 14px;
    width: 100%;
    border: 1px solid #ccc;
    border-radius: 10px;
    margin-top: 6px;
    box-sizing: border-box;
    transition: border-color 0.3s ease;
    }

    input:focus,
    select:focus {
    border-color: #6eabec;
    outline: none;
    }

    button {
    padding: 12px 18px;
    background-color: #6eabec;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: bold;
    width: 20%;
    transition: background-color 0.3s;
    }

    button:hover {
    background-color: #3d8edb;
    }

    canvas {
    background-color: white;
    border-radius: 15px;
    padding: 15px;
    box-shadow: 0 2px 8px rgba(201, 60, 60, 0.1);
    font-family: 'Segoe UI', sans-serif;
    }

</style>
