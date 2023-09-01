import React, { FC, useRef, useEffect, useState } from "react";
import "./Firebase.css";
import { initializeApp } from "firebase/app";
import "firebase/analytics";
import { DataSnapshot, get, getDatabase, ref } from "firebase/database";
import Plot from "react-plotly.js";
import Plotly, { Layout } from "plotly.js";
import { data } from "jquery";

const initializeFirebase = () => {
  // Initialize Firebase
  const appreturn = initializeApp({
    apiKey: "AIzaSyDIy-XQqLfxP1zEsxwHzF8Y33ak4Pyr0A4",
    authDomain: "voyteklabstudy.firebaseapp.com",
    databaseURL: "https://voyteklabstudy-default-rtdb.firebaseio.com",
    projectId: "voyteklabstudy",
    storageBucket: "voyteklabstudy.appspot.com",
    messagingSenderId: "565549672209",
    appId: "1:565549672209:web:fcd188621ae303d0b08eb0",
    measurementId: "G-ZNQCNC99NZ",
  });
  console.log(appreturn);
  // getAnalytics(appreturn);
};

interface myState {
  plots: any[];
}
const layout_params: any={
// Layout
dragmode: 'select',
selectdirection: "h",
xaxis: { zeroline: false },
showlegend: true,
width: 1000,
height: 150,
margin: {
    l: 25,
    r: 25,
    b: 25,
    t: 25,
    pad: 5
  }
}

class FirebaseComponent extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      plots: [] as any[],
    };
    this.initializePage();
  }

  initializePage() {
    let sigs, users;
    let sig_refs: string[] = [];
    let test_sigs: number = 9 ;
    this.getSigCount().then((num_sigs) => {
      console.log(num_sigs);
      if (num_sigs == 0) {
        console.log("no sigs available");
        return;
      }
      const sig_idxs = this.pick_sigs(test_sigs, num_sigs);
      const sig_refs = this.refs_from_idxs(sig_idxs);
      console.log(sig_refs);
      const dataPromise = this.getSigs(sig_refs);
      dataPromise.then((data) => {
        const x_list = [];
        const y_list = [...data];

        if (y_list.length != test_sigs) {
          console.log("wrong number of sigs");
          return;
        }
        for (let i = 0; i < y_list.length; i++) {
          x_list.push(this.make_new_x_burst(0, y_list[i].length));
        }
        console.log(x_list);
        console.log(y_list);
        const plots: any[] = [];
        const plotly_burst: any[] = [];
        const plotly_before: any[] = [];
        const plotly_after: any[] = [];
        for (let i = 0; i < x_list.length; i++) {
          const data_elements_before = {
            x: [],
            y: [],
            type: "scattergl",
            name: `sig_${i}`,
            marker: { color: "black" },
          };
          const data_elements_burst = {
            x: x_list[i],
            y: y_list[i],
            type: "scattergl",
            name: `sig_${i}`,
            marker: { color: "red" },
          };
          const data_elements_after = {
            x: [],
            y: [],
            type: "scattergl",
            name: `sig_${i}`,
            marker: { color: "black" },
          };

          plotly_burst.push([
            data_elements_before,
            data_elements_burst,
            data_elements_after,
          ]);
        }
        console.log(plotly_burst.length);
        this.setState({
          plots: plotly_burst,
        });
      });
    });
  }
  async getSigCount(): Promise<number> {
    const dbref = ref(getDatabase(), "n_sigs");
    const snapshot = await get(dbref);
    let val = 0;
    if (snapshot.exists()) {
      console.log(snapshot.val());
      const num_sigs = snapshot.val();
      return snapshot.val();
    } else {
      console.log("n_sig data unavailable from firebase");
      return 0;
    }
  }

  make_new_x_burst(x0: number, x1: number): number[] {
    let new_x_burst: number[] = [];
    for (let i = x0; i < x1; i++) {
      new_x_burst.push(i);
    }
    return new_x_burst;
  }

  make_corr_y_burst(x0: number, x1: number, y: number[]): number[] {
    let new_y_burst: number[] = [];
    for (let i = x0; i < x1; i++) {
      new_y_burst.push(y[i]);
    }
    return new_y_burst;
  }

  pick_sigs(sigs_to_show: number, total_sigs: number): number[] {
    let sig_idxs: number[] = [];
    // picking sigs to show
    for (let i = 0; i < sigs_to_show; ) {
      // https://www.w3schools.com/JS/js_random.asp
      let rand_int = Math.floor(Math.random() * total_sigs);
      if (sig_idxs.includes(rand_int)) {
        // find a new random integer because this one is taken
        continue;
      } else {
        // increment on this step because this is when we have a NEW random int
        sig_idxs.push(rand_int);
        i++;
      }
    }
    return sig_idxs;
  }

  refs_from_idxs(sig_idxs: number[]): string[] {
    let sig_refs: string[] = [];
    for (let i = 0; i < sig_idxs.length; i++) {
      sig_refs.push(`sig_${sig_idxs[i]}`);
    }
    return sig_refs;
  }

  async getSigs(sig_refs: string[]): Promise<number[][]> {
    console.log("running callback");
    const values: number[][] = [];
    // get all json data for each sig
    const promise_array = [];
    for (let i = 0; i < sig_refs.length; i++) {
      const dbref = ref(getDatabase(), `sigs/${sig_refs[i]}`);
      promise_array.push(get(dbref));
    }
    const values2: Promise<number[][]> = Promise.all(promise_array).then(
      (snapshots) => {
        console.log(snapshots);
        for (let i = 0; i < snapshots.length; i++) {
          if (snapshots[i].exists()) {
            console.log(snapshots[i].val());
            values.push(snapshots[i].val() as number[]);
          } else {
            console.log(`snapshot ${i} unavailable`);
          }
        }
        console.log(values);
        return values;
      }
    );
    return values2;
  }

  // Let n=x.length
  // new_x_before=[0,1,2,...,x0-1]
  // new_x_burst=[x0,x0+1,...,x1-1]
  // new_x_after=[x1,x1+1,...,n-1]

  updatePlot(index: number, x0: number, x1: number) {
    const { plots } = this.state as myState;
    const plot_i_3_tuple = plots[index];
    // at any moment, the concatenated x_vals and y_vals have same length: the signal length
    const all_x_vals = plot_i_3_tuple[0].x
      .concat(plot_i_3_tuple[1].x)
      .concat(plot_i_3_tuple[2].x);
    const all_y_vals = plot_i_3_tuple[0].y
      .concat(plot_i_3_tuple[1].y)
      .concat(plot_i_3_tuple[2].y);
    
    // partitioning the x_vals and y_vals into 3 parts described by x0,x1
    const new_x_before = this.make_new_x_burst(0, x0);
    const new_y_before = this.make_corr_y_burst(0, x0, all_y_vals);
    const new_x_burst = this.make_new_x_burst(0, x1);
    const new_y_burst = this.make_corr_y_burst(x0, x1, all_y_vals);
    const new_x_after = this.make_new_x_burst(x1, all_x_vals.length);
    const new_y_after = this.make_corr_y_burst(x1,all_x_vals.length,all_y_vals);
    const data_elements_before = {
      x: new_x_before,
      y: new_y_before,
      type: "scattergl",
      name: `sig_${index}`,
      marker: { color: "black" },
    };
    const data_elements_burst = {
      x: new_x_burst,
      y: new_y_burst,
      type: "scattergl",
      name: `sig_${index}`,
      marker: { color: "red" },
    };
    const data_elements_after = {
      x: new_x_after,
      y: new_y_after,
      type: "scattergl",
      name: `sig_${index}`,
      marker: { color: "black" },
    };
    const new_plot_i_3_tuple = [
      data_elements_before,
      data_elements_burst,
      data_elements_after,
    ];
    plots[index] = new_plot_i_3_tuple;
    this.setState({
      plots: plots,
    });
  }

  render() {
    const { plots } = this.state as myState;
    if (plots.length > 0) {
      return (
        <div className="FirebaseComponent">
          {plots.map((plotData, i) => (
            <div>
              <Plot
                key={i}
                data={[plotData[0], plotData[1], plotData[2]]}
                layout={layout_params}
                onSelected={
                  (e) => {
                    console.log(e);
                    if (e.range == undefined) {
                      return;
                    }
                    // console.log(data)
                    const x0 = e.range.x[0];
                    const x1 = e.range.x[1];
                    console.log(x0);
                    console.log(x1);
                    if (x0 == undefined || x1 == undefined) {
                      return;
                    }
                    this.updatePlot(i, x0, x1);
                  }
                }
              />
            </div>
          ))}
        </div>
      );
    } else {
      return <div className="FirebaseComponent">Loading...</div>;
    }
  }
}

export { initializeFirebase, FirebaseComponent };
