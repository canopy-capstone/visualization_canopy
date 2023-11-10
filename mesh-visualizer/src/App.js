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

  // Iterate through every value in the thickness file and assign a color corresponding to it
  for (let i = 0; i < color_arr.length; i += 4) {
    curr_thickness = thickness[i / 4];

    // Apply logarithmic transformation
    curr_thickness = Math.log(curr_thickness + 1);  // Adding 1 to avoid log(0)
    normalizedVal = (curr_thickness - Math.log(min + 1)) / (Math.log(max + 1) - Math.log(min + 1));

    // if (transparency > normalizedVal) {
    //   // Set the alpha to adjust transparency
    //   color_arr[i + 3] = 255;
    // } else {
    //   // Set the alpha to 0 for triangles with low thickness when transparency is low
    //   color_arr[i + 3] = 0;
    // }

    // color_arr[i + 3] = transparency < normalizedVal ? 0 : 255;

    color_arr[i] = Math.round(255 * (normalizedVal));
    color_arr[i+1] = 0;
    color_arr[i+2] = Math.round(255 * (1 - normalizedVal));
    color_arr[i + 3] = normalizedVal <= transparency ? 255 : 0;
  }

  return color_arr;
}

let minThickness, maxThickness;
function App() {
  const vtkContainerRef = useRef(null);
  const [transparency, setTransparency] = useState(0.5); // Initial transparency value
  const fullScreenRendererRef = useRef(null); // Ref to store the vtkFullScreenRenderWindow instance

  useEffect(() => {

    const loadSTL = async () => {
      const reader = vtkSTLReader.newInstance();
      await reader.setUrl('./simple-calibration-part-v1.STL');

      try {
        if (!fullScreenRendererRef.current) {
          // Create vtkFullScreenRenderWindow only once
          fullScreenRendererRef.current = vtkFullScreenRenderWindow.newInstance({
            rootContainer: vtkContainerRef.current,
          });
        }

        const renderer = fullScreenRendererRef.current.getRenderer();

        // Remove existing actors from the renderer
        renderer.getActors().forEach((actor) => renderer.removeActor(actor));

        const mapper = vtkMapper.newInstance();
        mapper.setInputData(reader.getOutputData());

        const actor = vtkActor.newInstance();
        actor.setMapper(mapper);

        const thicknessValues = await readThicknessValuesFromFile('./thickness.txt');
        minThickness = Math.min(...thicknessValues);
        maxThickness = Math.max(...thicknessValues);

        // Create color array based on thickness values and transparency
        const colors = load_gradient(thicknessValues, minThickness, maxThickness, transparency);

        const colorDataArray = vtkDataArray.newInstance({
          name: 'Colors',
          values: colors,
          numberOfComponents: 4, // RGB + alpha
        });

        reader.getOutputData().getCellData().setScalars(colorDataArray);

        // Add the new actor to the renderer
        renderer.addActor(actor);
        renderer.resetCamera();
        fullScreenRendererRef.current.getRenderWindow().render();
      } catch (error) {
        console.error('Error loading STL:', error);
      }
    };

    loadSTL();
  }, [transparency]);

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
      </div>
    </div>
  );
}

export default App;