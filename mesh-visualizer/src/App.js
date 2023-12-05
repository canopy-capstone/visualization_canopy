import { useState, useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
// import vtkOBJReader from "@kitware/vtk.js/IO/Misc/OBJReader";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader";
// import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

// Function to load the thickness text file
function readThicknessValuesFromFile(url) {
  return fetch(url)
    .then(response => response.text())
    .then(data => data.trim().split('\n').map(Number))
    .catch(error => {
      console.error('Error reading the file:', error);
      return [];
    });
}

// This function will load the coloring for the triangles based on their thickness
function load_gradient(thickness, min, max, transparency) {
  const color_arr = new Uint8Array(thickness.length * 4);
  let normalizedVal, curr_thickness;

  // const r = Math.abs(rgb_max[0] - rgb_min[0]);
  // const g = Math.abs(rgb_max[1] - rgb_min[1]);
  // const b = Math.abs(rgb_max[2] - rgb_min[2]);
  // Iterate through every value in the thickness file and assign a color corresponding to it
  for (let i = 0; i < color_arr.length; i += 4) {
    curr_thickness = thickness[i / 4];

    // Apply logarithmic transformation
    curr_thickness = Math.log(curr_thickness + 1);  // Adding 1 to avoid log(0)
    normalizedVal = (curr_thickness - Math.log(min + 1)) / (Math.log(max + 1) - Math.log(min + 1));

    color_arr[i] = Math.round(255 * (normalizedVal));
    color_arr[i+1] = 0;
    color_arr[i+2] = Math.round(255 * (1 - normalizedVal));
    color_arr[i + 3] = normalizedVal <= transparency ? 255 : 0;
  }

  return color_arr;
}

function hexToRgb(hex) {
  var bigint = parseInt(hex, 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  return [r, g, b];
}

let minThickness, maxThickness, thicknessValues;
const rgbToHex = (rgb) => `#${rgb.map((val) => val.toString(16).padStart(2, '0')).join('')}`;

function App() {
  const vtkContainerRef = useRef(null);
  const [transparency, setTransparency] = useState(1.0);
  const [initialized, setInitialized] = useState(false);
  const fullScreenRendererRef = useRef(null);
  const [rgb_min, setRgb_min] = useState([255, 0, 0]);
  const [rgb_max, setRgb_max] = useState([0, 0, 255]);

  // Load STL and initialize thickness values on component mount
  useEffect(() => {
    const loadSTL = async () => {
      const reader = vtkSTLReader.newInstance();
      await reader.setUrl('./test_items/bunny/thickness_model.stl');

      try {
        if (!fullScreenRendererRef.current) {
          fullScreenRendererRef.current = vtkFullScreenRenderWindow.newInstance({
            rootContainer: vtkContainerRef.current,
          });
        }

        const renderer = fullScreenRendererRef.current.getRenderer();
        renderer.getActors().forEach((actor) => renderer.removeActor(actor));

        const mapper = vtkMapper.newInstance();
        mapper.setInputData(reader.getOutputData());

        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);

        thicknessValues = await readThicknessValuesFromFile('./test_items/bunny/thickness.txt');
        minThickness = Math.min(...thicknessValues);
        maxThickness = Math.max(...thicknessValues);

        // Initial color array
        const colors = load_gradient(thicknessValues, minThickness, maxThickness, transparency);
        const colorDataArray = vtkDataArray.newInstance({
          name: 'Colors',
          values: colors,
          numberOfComponents: 4,
        });

        reader.getOutputData().getCellData().setScalars(colorDataArray);

        renderer.addActor(actor);
        renderer.resetCamera();
        fullScreenRendererRef.current.getRenderWindow().render();
        setInitialized(true)
      } catch (error) {
        console.error('Error loading STL:', error);
      }
    };
    if(!initialized)
    {
      loadSTL();
    }
  },);
  // [transparency, rgb_min, rgb_max]

  // Update color array when transparency changes
  useEffect(() => {
    const loadColor = async () => {
      if (initialized && fullScreenRendererRef.current) {
        const renderer = fullScreenRendererRef.current.getRenderer();
        const actor = renderer.getActors()[0]; // Assuming there is only one actor

        if (actor) {
          const colors = load_gradient(thicknessValues, minThickness, maxThickness, transparency);
          const colorDataArray = vtkDataArray.newInstance({
            name: 'Colors',
            values: colors,
            numberOfComponents: 4,
          });

          actor.getMapper().getInputData().getCellData().setScalars(colorDataArray);
          console.log('Scalars Updated:', colorDataArray);

          fullScreenRendererRef.current.getRenderWindow().render();
        }
      }
    }
    loadColor();
  }, [transparency, initialized]);


  // <input
  //       type="color"
  //       id="colorpicker"
  //       value={rgbToHex(rgb_min)}
  //       onChange={(e) => setRgb_min([...parseInt(e.target.value.slice(1, 3), 16), ...parseInt(e.target.value.slice(3, 5), 16), ...parseInt(e.target.value.slice(5), 16)])}
  //       style={{ zIndex: 2, marginTop: '20px', left: '100px' }}
  //     ></input>
  //     <label for="colorpicker" style={{ zIndex: 2, marginTop: '20px' }}> To </label>
  //     <input
  //       type="color"
  //       id="colorpicker"
  //       value={rgbToHex(rgb_max)}
  //       onChange={(e) => setRgb_max([...parseInt(e.target.value.slice(1, 3), 16), ...parseInt(e.target.value.slice(3, 5), 16), ...parseInt(e.target.value.slice(5), 16)])}
  //       style={{ zIndex: 2, marginTop: '20px' }}
  //     ></input>
  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <div ref={vtkContainerRef} style={{ flex: 1 }}>
        {/* Adjust the flex property based on your layout */}
      </div>
      

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh', // Make the container full height
        }}
      >
        <label htmlFor="transparencySlider" style={{ zIndex: 2, marginBottom: '100px' }}>Min: {minThickness}</label>
        <input
          style={{
            width: '400px',
            height: '200px',
            transform: 'rotate(-90deg)',
            backgroundColor: '#3498db',
            marginBottom: '20px',
          }}
          type="range"
          min='0'
          max='1'
          step="0.01"
          value={transparency}
          onChange={(e) => setTransparency(parseFloat(e.target.value))}
        />
        {transparency}
        <label htmlFor="transparencySlider" style={{ zIndex: 2, marginTop: '60px' }}>Max: {maxThickness}</label>
      </div>
      
    </div>
  );
}

export default App;