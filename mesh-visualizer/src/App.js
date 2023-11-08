import { useRef, useEffect } from 'react';

import '@kitware/vtk.js/Rendering/Profiles/Geometry';

import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';

import vtkActor           from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper          from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkOBJReader from "@kitware/vtk.js/IO/Misc/OBJReader";

function App() {
  const vtkContainerRef = useRef(null);
  // const [coneResolution, setConeResolution] = useState(10);
  // const [representation, setRepresentation] = useState(2);

    useEffect(() => {
      const loadSTL = async () => {
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
          rootContainer: vtkContainerRef.current,
        });

        const reader = vtkOBJReader.newInstance();
        await reader.setUrl('./suzanne.obj'); // Replace with the path to your STL file

        try {
          const mapper = vtkMapper.newInstance();
          mapper.setInputData(reader.getOutputData());

          const actor = vtkActor.newInstance();
          actor.setMapper(mapper);

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