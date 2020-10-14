import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { CardContent, Grid } from '@material-ui/core';
import SelectBox from './SelectBox';
import { Measurement } from './Dashboard';
import { DataSelected } from './DataSelected';

const useStyles = makeStyles({
  taskBar: {
    backgroundColor: '#60a3bc',
  },
});

export default (props: {
  metrics: string[];
  selection: (string | undefined)[];
  setSelection: Function;
  latestData: Measurement[];
}) => {
  const { metrics, selection, setSelection, latestData } = props;
  const classes = useStyles();
  return (
    <CardContent className={classes.taskBar}>
      <Grid container spacing={4} justify="space-between">
        <Grid item xs={12} sm={6}>
          {/*render a tag displaying latest data for each selected metric*/}
          {latestData.map(measurement => {
            return selection.includes(measurement.metric) ? (
              <DataSelected key={`${measurement.metric}: ${measurement.value}`} measurement={measurement} />
            ) : null;
          })}
        </Grid>
        <Grid item xs={12} sm={6}>
          {/*render a select box that will set the selection object in Dashboard state*/}
          <SelectBox metrics={metrics} selection={selection} setSelection={setSelection} />
        </Grid>
      </Grid>
    </CardContent>
  );
};
