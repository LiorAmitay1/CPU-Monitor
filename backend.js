require('dotenv').config();
const express = require('express');
const cors = require('cors')
const AWS = require('aws-sdk');

const app = express();
app.use(cors())
const port = process.env.PORT || 3000;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});


const cloudwatch = new AWS.CloudWatch();

app.get('/cpu', async (req, res) => {
  const { ip, startTime, endTime, interval } = req.query
  console.log('Received query:', req.query)


  if (!ip || !startTime || !endTime || !interval) {
    return res.status(400).json({ 
      error: 'Missing parameters', 
      received: { ip, startTime, endTime, interval } 
    });  
  }

  try {
    const ec2 = new AWS.EC2()
    const instances = await ec2.describeInstances({
      Filters: [
        {
          Name: 'private-ip-address',
          Values: [ip]
        }
      ]
    }).promise()

    const instance = instances.Reservations[0]?.Instances[0]

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found for this IP' })
    }

    const instanceId = instance.InstanceId

    const params = {
      Namespace: 'AWS/EC2',
      MetricName: 'CPUUtilization',
      Dimensions: [
        { Name: 'InstanceId', Value: instanceId }
      ],
      StartTime: new Date(startTime),
      EndTime: new Date(endTime),
      Period: parseInt(interval),
      Statistics: ['Average']
    }

    const data = await cloudwatch.getMetricStatistics(params).promise()
    res.json(data)
  } catch (err) {
    console.error('Error fetching data:',err)
    res.status(500).json({ error: err.message })
  }
})


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
