import { useRef, useEffect } from 'react';

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
function load_gradient(thickness, min, max) {
  
  const color_arr = new Uint8Array(thickness.length * 3);
  
  let normalizedVal, curr_thickness;
  // Iterate through every value in the thickness file and assign a color corresponding to it
  for (let i = 0; i < color_arr.length; i += 3) {
    curr_thickness = thickness[i / 3];
    // Apply logarithmic transformation
    curr_thickness = Math.log(curr_thickness + 1);  // Adding 1 to avoid log(0)
    normalizedVal = (curr_thickness - Math.log(min + 1)) / (Math.log(max + 1) - Math.log(min + 1));

    // Calculate the normalizing value so that the scale is from the min to max thickness in the file.
    // normalizedVal = (curr_thickness - min) / (max - min);

    color_arr[i] = 50;
    color_arr[i+1] = Math.round(255 * (normalizedVal));
    color_arr[i+2] = Math.round(255 * (1 - normalizedVal));
  }

  return color_arr;
}
  

function App() {
  const vtkContainerRef = useRef(null);

    useEffect(() => {
      const loadSTL = async () => {
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
          rootContainer: vtkContainerRef.current,
        });

        const reader = vtkSTLReader.newInstance();
        await reader.setUrl('./simple-calibration-part-v1.STL'); // Replace with the path to your STL file

        try {
          const mapper = vtkMapper.newInstance();
          mapper.setInputData(reader.getOutputData());

          const actor = vtkActor.newInstance();
          actor.setMapper(mapper);

          const thicknessValues = await readThicknessValuesFromFile('./thickness.txt');
          const minThickness = Math.min(...thicknessValues);
          const maxThickness = Math.max(...thicknessValues);

          // Create color array based on thickness values
          const colors = load_gradient(thicknessValues, minThickness, maxThickness);

          const colorDataArray = vtkDataArray.newInstance({
            name: 'Colors',
            values: colors,
            numberOfComponents: 3, // RGB
          });

          reader.getOutputData().getCellData().setScalars(colorDataArray);

          const renderer = fullScreenRenderer.getRenderer();
          renderer.addActor(actor);
          renderer.resetCamera();
          fullScreenRenderer.getRenderWindow().render();
        } catch (error) {
          console.error('Error loading STL:', error);
        }
      };
      
      loadSTL();
    }, []);


  return (
      <div>
        <div ref={vtkContainerRef} />
        {/*<table*/}
        {/*    style={{*/}
        {/*      position: 'absolute',*/}
        {/*      top: '25px',*/}
        {/*      left: '25px',*/}
        {/*      background: 'white',*/}
        {/*      padding: '12px',*/}
        {/*    }}*/}
        {/*>*/}
        {/*  <tbody>*/}
        {/*  <tr>*/}
        {/*    <td>*/}
        {/*      <select*/}
        {/*          value={representation}*/}
        {/*          style={{ width: '100%' }}*/}
        {/*          onInput={(ev) => setRepresentation(Number(ev.target.value))}*/}
        {/*      >*/}
        {/*        <option value="0">Points</option>*/}
        {/*        <option value="1">Wireframe</option>*/}
        {/*        <option value="2">Surface</option>*/}
        {/*      </select>*/}
        {/*    </td>*/}
        {/*  </tr>*/}
        {/*  <tr>*/}
        {/*    <td>*/}
        {/*      <input*/}
        {/*          type="range"*/}
        {/*          min="4"*/}
        {/*          max="80"*/}
        {/*          value={coneResolution}*/}
        {/*          onChange={(ev) => setConeResolution(Number(ev.target.value))}*/}
        {/*      />*/}
        {/*    </td>*/}
        {/*  </tr>*/}
        {/*  </tbody>*/}
        {/*</table>*/}
      </div>
  );
}

export default App;