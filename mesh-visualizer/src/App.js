import { useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkOBJReader from "@kitware/vtk.js/IO/Misc/OBJReader";
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader";
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';

function readThicknessValuesFromFile(url) {
  return fetch(url)
    .then(response => response.text())
    .then(data => data.trim().split('\n').map(Number))
    .catch(error => {
      console.error('Error reading the file:', error);
      return [];
    });
}

function App() {
  const vtkContainerRef = useRef(null);
  // const [coneResolution, setConeResolution] = useState(10);
  // const [representation, setRepresentation] = useState(2);

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

          const colors = new Uint8Array(reader.getOutputData().getNumberOfCells() * 3); // 3 bytes per cell for RGB
          // const copiedColors = new Uint8Array(colors.length);

          // Assign colors to specific triangles
          let init_red = 50.0;
          let init_green = 255.0;
          let init_blue = 50.0;
          const step_size = 410.0 / (colors.length / 3);

          for (let i = 0; i < colors.length; i += 3) {
            // Example: Color the first triangle red (1.0, 0.0, 0.0)

            if ((init_red + step_size) >= 255) {
              init_red = 255;
              init_green -= step_size;
            }else{
              init_red += step_size
            }
            colors[i] = init_red;   // Red
            colors[i + 1] = init_green; // Green
            colors[i + 2] = init_blue; // Blue
          }

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
      const fileUrl = './thickness.txt';
      readThicknessValuesFromFile(fileUrl)
        .then(thicknessValues => {
          console.log(thicknessValues);
        });
      loadSTL();
    }, []);

//   const colors = new Uint8Array(model.getNumberOfCells() * 3); // 3 bytes per cell for RGB
//
// // Assign colors to specific triangles
//   for (let i = 0; i < colors.length; i += 3) {
//     // Example: Color the first triangle red (255, 0, 0)
//     colors[i] = 255;   // Red
//     colors[i + 1] = 0; // Green
//     colors[i + 2] = 0; // Blue
//   }
//
// // Create a cell data array and attach it to the model
//   const colorDataArray = vtk.Common.Core.vtkDataArray.newInstance({
//     name: 'Colors',
//     values: colors,
//     numberOfComponents: 3, // RGB
//   });
//
//   model.getCellData().setScalars(colorDataArray);

  // Assuming you have the `actor` and `mapper` from the STL model
//   const renderer = fullScreenRenderer.getRenderer();
//
// // Set up the cell data mapping
//   actor.getProperty().setInterpolationToFlat(); // For flat shading
//   actor.getProperty().setEdgeVisibility(true); // Show edges
//
// // Set color mapping based on cell data
//   const lut = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();
//   lut.setMappingRange(0, model.getNumberOfCells() - 1);
//   lut.addRGBPoint(0, 1, 0, 0); // Example: Map the first cell to red
//
//   mapper.setInputData(model);
//   mapper.setLookupTable(lut);



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