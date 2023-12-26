import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import CameraIcon from "@mui/icons-material/PhotoCamera";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import CssBaseline from "@mui/material/CssBaseline";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import { createTheme, ThemeProvider } from "@mui/material/styles";

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {"Copyright © "}
      <Link color="inherit" href="https://mui.com/">
        Your Website
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}

const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// TODO remove, this demo shouldn't need to reset the theme.
const defaultTheme = createTheme();

export default function Details() {
  return (
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline />
      <main>
        {/* Hero unit */}
        <Box
          sx={{
            bgcolor: "background.paper",
            pt: 8,
            pb: 6,
          }}
        >
          <Container maxWidth="lg">
            <Typography
              component="h1"
              variant="h2"
              align="center"
              color="text.primary"
              gutterBottom
            >
              Welcome to our neural oscillation labeler!
            </Typography>
            <Typography
              variant="h5"
              align="center"
              color="text.secondary"
              paragraph
            >
              <p>
                Once you select “Begin” you will be presented with a single
                1-second plot of a neural time series. The game is to select the
                one time window where you think there might be an approximately
                10 Hz oscillation
                <br />
                (it’s not the most exciting game).
              </p>
              <p>
                Using your mouse, select the time interval where you think the
                oscillation might span, from start to stop. Once you’ve
                highlighted the window, you can drag the starting- and stopping
                points to refine your selection. (Although you can also refine
                the vertical interval, it will not be used in the analysis so
                don’t bother).
              </p>
              <p>
                You can reset your selection by double-clicking anywhere on the
                plot. Once you’re confident with your selection, click the “Save
                and Next” button to move onto the next signal.
              </p>
              <p>
                While it is more likely than not that an oscillation is present,
                some of the time series you see will have no oscillation in
                them! In those cases make no selection, and simply click “Save
                and Next”.
              </p>
              <p>There will be 100 time series in total.</p>
              <p>
                Some of these time series show real data, and some show
                simulated data. Remember there is only a 10 Hz oscillation in
                these data, so even if you think you see a faster or slower
                oscillation, there isn’t one in these data! Once you’ve labeled
                all the time series, enter your name in the input box and press
                submit.
              </p>
              <br />
              Thanks for playing!
            </Typography>
            
          </Container>
        </Box>
      </main>
    </ThemeProvider>
  );
}
