import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Card, CardContent } from '@material-ui/core';
import DashHeader from './DashHeader';
import Chart from './Chart';
import { client } from '../App';
import { useSubscription } from '@apollo/react-hooks';
import { gql } from '@apollo/client';
import {getMetrics, getData, newMeasurementsSub } from '../Querys/Querys';

const useStyles = makeStyles({
  card: {
    margin: '5% 10%',
    background: "#60a3bc"
    
  },
  taskBar: {
    backgroundColor: 'silver',
  },
});

// date for befor 
const dataBefor = new Date(Date.now() - 30 * 30000).getTime();
export const getInputQuery = (metrics: string[]) => {
  return metrics.map(metric => {
    return `{ metricName: "${metric}", after: ${dataBefor} }`;
  });
};

// fetch metric Name from API
const fetchMetrics = async () => {
  const res = await client.query({
    query: gql`
      ${getMetrics}
    `,
  });
  return res.data.getMetrics;
};

const fetchData = async (metrics: string[]) => {
  const res = await client.query({
    query: gql`
      ${getData(getInputQuery(metrics))}
    `,
  });
  return res.data.getMultipleMeasurements;
};


export interface Measurement {
  metric: string;
  at: number;
  value: number;
  unit: string;
}

//interface for the subscription
interface MeasurementSub {
  newMeasurement: Measurement;
}

//response from getData
interface MetricNode {
  metric: string;
  measurements: Measurement[];
}

//filters the transformed data 
const dataFilter = (data: Plotly.Data[], selection: (string | undefined)[]) => {
  let returnArr = data.filter(metricObj => {
    return selection.includes(metricObj.name);
  });

  
  const dmyObj: Plotly.Data = {
    x: [],
    y: [],
    name: '',
    yaxis: 'y',
    type: 'scatter',
    line: { color: '#444' },
  };

  returnArr.push(dmyObj);

  return returnArr;
};

const ChartData = (data: MetricNode[]) => {
  
  const returnArr: Plotly.Data[] = [];
  const colorArr: string[] = ['#a83a32', '#2d8fa1', '#5ba12d', '#9c2894', '#e6ad8e', '#32403f'];
  data.forEach(metricNode => {
    let metricObj: Plotly.Data = {
      x: [],
      y: [],
      name: '',
      yaxis: '',
      type: 'scatter',
      line: { color: colorArr[data.indexOf(metricNode)] },
    };
    metricNode.measurements.forEach(measurement => {
      (metricObj.x as Plotly.Datum[]).push(new Date(measurement.at));
      (metricObj.y as Plotly.Datum[]).push(measurement.value);
    });
    metricObj.name = metricNode.metric;
    switch (metricNode.measurements[0].unit) {
      case 'F':
        metricObj.yaxis = 'y';
        break;
      case 'PSI':
        metricObj.yaxis = 'y2';
        break;
      case '%':
        metricObj.yaxis = 'y3';
    }
    returnArr.push(metricObj);
  });
  return returnArr;
};

export default () => {
  const classes = useStyles();
  const [metric, setMetric] = useState<string[]>([]);
  const [selection, setSelection] = useState<(string | undefined)[]>([]);
  const [initialData, setInitialData] = useState<Plotly.Data[]>([]);
  const [filteredData, setFilteredData] = useState<Plotly.Data[]>([]);
  const {loading, data } = useSubscription<MeasurementSub>(newMeasurementsSub);
  const [prevSubData, setPrevSubData] = useState<Measurement>({metric: "", at: 0, value: 0, unit: ""});
  const [latestData, setLatestData] = useState<Measurement[]>([])


 useEffect(() => {
    const initialFetch = async () => {
      
      const metricsReseult = await fetchMetrics();
      const dataRes = await fetchData(metricsReseult);
      const transformedData = ChartData(dataRes);
      setMetric(metricsReseult);
      let initialLatestData: Measurement[] = [] 
      metricsReseult.forEach((metric: string)=>{
        initialLatestData.push({metric: metric, at: 0, value: 0, unit: ""})
      })
      setLatestData(initialLatestData);
      setInitialData(transformedData);
      // console.log(getInputQuery(metricsReseult));
    };
    initialFetch();
  }, []);

 useEffect(() => {
    const filteredData = dataFilter(initialData, selection);
    setFilteredData(filteredData);
  }, [initialData, selection]);

 useEffect(()=>{
    if (!loading && (data?.newMeasurement.at !== prevSubData.at || data.newMeasurement.value !== prevSubData.value || data.newMeasurement.metric !== prevSubData.metric)) {
        let measurementNode = data?.newMeasurement
        let matchingSet = initialData.find((metricNode)=>metricNode.name === measurementNode?.metric);
        if (matchingSet && measurementNode){
          //push the new data into the corresponding metric's data array
          (matchingSet.x as Plotly.Datum[]).push(new Date(measurementNode.at));
          (matchingSet.y as Plotly.Datum[]).push(measurementNode.value);
          const updatedData = initialData.map((metricNode)=>{
            if(metricNode.name === measurementNode?.metric){
              return matchingSet
            } else {
              return metricNode
            }
          });
          setInitialData(updatedData as Plotly.Data[]);
          if (data) {
            let latestDataTemplate = latestData.map((measurement)=>{
              return measurement.metric === data.newMeasurement.metric ? data.newMeasurement : measurement
            })
            setLatestData(latestDataTemplate)
            setPrevSubData(data.newMeasurement)
          }
        }
      }
  },[initialData, loading, data, prevSubData, latestData])

  return (
    <Card className={classes.card}>
      <DashHeader metrics={metric} selection={selection} setSelection={setSelection} latestData={latestData}/>
      <CardContent style={{ padding: 0 }} >
        <Chart data={filteredData} />
      </CardContent>
    </Card>
  );
};
