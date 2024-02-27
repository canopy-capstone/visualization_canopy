import React, { useState, useRef, useEffect } from 'react';
import '@kitware/vtk.js/Rendering/Profiles/Geometry';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkCellPicker from "@kitware/vtk.js/Rendering/Core/CellPicker";
import {max, min} from "lodash";

export const VtkDataTypes = {
  VOID: '', // not sure to know what that should be
  CHAR: 'Int8Array',
  SIGNED_CHAR: 'Int8Array',
  UNSIGNED_CHAR: 'Uint8Array',
  SHORT: 'Int16Array',
  UNSIGNED_SHORT: 'Uint16Array',
  INT: 'Int32Array',
  UNSIGNED_INT: 'Uint32Array',
  FLOAT: 'Float32Array',
  DOUBLE: 'Float64Array',
};

export const DefaultDataType = VtkDataTypes.DOUBLE;

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
function load_gradient(thickness, min, max, transparency, startColor, endColor) {
  const color_arr = new Uint8Array(thickness.length * 4);
  let normalizedVal, curr_thickness;

  // Iterate through every value in the thickness file and assign a color corresponding to it
  for (let i = 0; i < color_arr.length; i += 4) {
    curr_thickness = thickness[i / 4];
    // Apply logarithmic transformation
    curr_thickness = Math.log(curr_thickness + 1); // Adding 1 to avoid log(0)
    normalizedVal = (curr_thickness - Math.log(min + 1)) / (Math.log(max + 1) - Math.log(min + 1));

    color_arr[i] = Math.round(startColor.r + (startColor.r - endColor.r) * normalizedVal);
    color_arr[i + 1] = Math.round(startColor.g + (startColor.g - endColor.g) * normalizedVal);
    color_arr[i + 2] = Math.round(startColor.b + (startColor.b - endColor.b) * normalizedVal);
    color_arr[i + 3] = normalizedVal <= transparency ? 255 : 0;

    // Ran into some errors loading triangles below a certain range so added this
    if (normalizedVal < 9.0 / 10**6){
      color_arr[i] = endColor.r;
      color_arr[i+1] = endColor.g;
      color_arr[i+2] = endColor.b;
    }
  }

  return color_arr;
}

function above_gradient(thickness, bound, startColor, endColor){
  const color_arr = new Uint8Array(thickness.length * 4);

  // Iterate through every value in the thickness file and assign a color corresponding to it
  for (let i = 0; i < color_arr.length; i += 4) {
    const curr_thickness = thickness[i/4];
    const isAboveBound = curr_thickness > bound; // Check if thickness is above the bound
    
    // If thickness is above the bound, it should be endColor (blue), else startColor (red)
    color_arr[i] = isAboveBound ? startColor.r : endColor.r; // Red
    color_arr[i + 1] = isAboveBound ? startColor.g : endColor.g; // Green
    color_arr[i + 2] = isAboveBound ? startColor.b : endColor.b; // Blue
    color_arr[i + 3] = isAboveBound ? 100 : 255; // Alpha (fully opaque)
  }
  return color_arr;
}

let minThickness, maxThickness, thicknessValues;
function App() {
  const vtkContainerRef = useRef(null);
  const [transparency, setTransparency] = useState(1.0);
  const [stepSize, setStepSize] = useState(0.01);
  const [initialized, setInitialized] = useState(false);
  const [startColor, setStartColor] = useState({ r: 255, g: 0, b: 0 });
  const [endColor, setEndColor] = useState({ r: 0, g: 0, b: 255 });
  const [debugInfo, setDebugInfo] = useState(null);
  const fullScreenRendererRef = useRef(null);
  const [stlFile, setStlFile] = useState(null);
  const [txtFile, setTxtFile] = useState(null);
  const [bound, setBound] = useState(0.0)
  const [tempBound, setTempBound] = useState(0.0); // Temporary state for form input

  // Load STL and initialize thickness values on component mount
  useEffect(() => {
    const loadSTL = async () => {
      if(initialized){
        return;
      }

      const reader = vtkSTLReader.newInstance();
      if (stlFile){
        const stlBlob = await stlFile.arrayBuffer();
        reader.parseAsArrayBuffer(stlBlob);
      }else{
        await reader.setUrl('./test_items/bunny/thickness_model.stl');
      }

      try {
        if (!fullScreenRendererRef.current && !initialized) {
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

        // thicknessValues = await readThicknessValuesFromFile('./test_items/bunny/thickness.txt');
        if (txtFile){
          thicknessValues = await txtFile.text().then(data => data.trim().split('\n').map(Number));
        } else {
          thicknessValues = await readThicknessValuesFromFile('./test_items/bunny/thickness.txt');
        }
        minThickness = min(thicknessValues);
        maxThickness = max(thicknessValues);

        // Initial color array
        const colors = load_gradient(
          thicknessValues,
          minThickness,
          maxThickness,
          transparency,
          startColor,
          endColor
        );

        const colorDataArray = vtkDataArray.newInstance({
          name: 'Colors',
          values: colors,
          numberOfComponents: 4,
        });

        reader.getOutputData().getCellData().setScalars(colorDataArray);

        if (renderer.getActors().length < 1)
        {
          renderer.addActor(actor);
        }

        renderer.resetCamera();
        fullScreenRendererRef.current.getRenderWindow().render();

        // setup picker
        fullScreenRendererRef.current.getRenderWindow().getInteractor().onRightButtonPress(callData =>
        {
          if (renderer !== callData.pokedRenderer)
          {
            return;
          }

          const picker = vtkCellPicker.newInstance();
          picker.setPickFromList(1);
          picker.setTolerance(0);
          picker.initializePickList();
          picker.addPickList(actor);

          const pos = callData.position;
          const point = [pos.x, pos.y, pos.z];
          console.log(`Pick at: ${point}`);
          picker.pick(point, renderer);

          const pickedCellId = picker.getCellId()
          console.log("picked cell: ", pickedCellId)
          const updatedDebugInfo = {
            x: pos.x,
            y: pos.y,
            z: pos.z,
            polygonId: pickedCellId
          }

          if (pickedCellId === -1)
          {
            setDebugInfo(null);
            return;
          }
          setDebugInfo(updatedDebugInfo);
        })

        setInitialized(true)
      } catch (error) {
        console.error('Error loading STL:', error);
      }
    };

    loadSTL();
  }, [initialized]);

  useEffect(() => {
    if (initialized && fullScreenRendererRef.current) {
      const renderer = fullScreenRendererRef.current.getRenderer();
      const actor = renderer.getActors()[0]; // Assuming there is only one actor
  
      if (actor) {
        // Determine which gradient function to use based on bound
        const colors = bound !== 0 ?
          above_gradient(thicknessValues, bound, startColor, endColor) :
          load_gradient(thicknessValues, minThickness, maxThickness, transparency, startColor, endColor);

        const colorDataArray = vtkDataArray.newInstance({
          name: 'Colors',
          values: colors,
          numberOfComponents: 4,
        });
  
        actor.getMapper().getInputData().getCellData().setScalars(colorDataArray);
        actor.getMapper().getInputData().modified();
        actor.getMapper().modified();
        fullScreenRendererRef.current.getRenderWindow().render();
      }
    }
  }, [bound, thicknessValues, startColor, endColor, transparency, initialized]);

  useEffect(() => {
    // This useEffect is responsible for resetting bound when transparency changes
    setBound(0.0);
    setTempBound('0.0');
  }, [transparency]);

  function handleStlFileChange(event) {
    const file = event.target.files[0];
    setStlFile(file);
    console.log(file);
  }

  // Handle TXT file change
  function handleTxtFileChange(event) {
    const file = event.target.files[0];
    setTxtFile(file);
    console.log(file);
  }

  function handleFormSubmit(event) {
    event.preventDefault(); // Prevent default form submission behavior
    setInitialized(false);
  }

  function handleBoundSubmit(event) {
    event.preventDefault(); // Prevent default form submission behavior
    const newBound = parseFloat(tempBound);
    setBound(newBound); // Update bound state with the input value
  }
  

  const rgbToHex = (color) => {
    const {r, g, b} = color;
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const sliderStyle = {
    background: `linear-gradient(to right, ${rgbToHex(endColor)} , ${rgbToHex(startColor)})`,
    width: '400px',
    height: '10px', // Adjust the height to fit your design
    borderRadius: '5px', // Optional: adds rounded corners to the slider background
    padding: '0', // Removes default padding
    transform: 'rotate(-90deg)',
    backgroundColor: '#3498db',
    marginBottom: '20px',
  };

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
        <label htmlFor="transparencySlider" style={{ zIndex: 2, position: 'absolute', top: '100px' }}>
          Max: {maxThickness}
        </label>
        <div style={sliderStyle}>
          <input
            type="range"
            min="0"
            max="1"
            step={stepSize}
            value={transparency}
            onChange={(e) => setTransparency(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '0%', // Make sure the slider thumb covers the gradient area
              opacity: 1,
              cursor: 'pointer', // Optional: changes the cursor on hover over the slider
              position: 'absolute',
              right: '-2px',
              top: '3px'
            }}
          />
        </div>
        {transparency}
        <label htmlFor="transparencySlider" style={{ zIndex: 2, position: 'absolute', bottom: '150px' }}>
          Min: {minThickness}
        </label>
        <td align="center" style={{ zIndex: 2, position: 'absolute', top: '10px' }}>
          <label htmlFor="startColor">From:</label>
          <input
            type="color"
            id="startColor"
            value={`#${(startColor.r * 0x10000 + startColor.g * 0x100 + startColor.b)
              .toString(16)
              .padStart(6, '0')}`}
            onChange={(e) => setStartColor(parseHexColor(e.target.value))}
          />

          <label htmlFor="endColor">To:</label>
          <input
            type="color"
            id="endColor"
            value={`#${(endColor.r * 0x10000 + endColor.g * 0x100 + endColor.b)
              .toString(16)
              .padStart(6, '0')}`}
            onChange={(e) => setEndColor(parseHexColor(e.target.value))}
          />
        </td>
      </div>
      {debugInfo &&
          <div style={{
            position: 'fixed',
            bottom: 10,
            left: 10
          }}>
            <div>Debug info:</div>
            <div>x: {debugInfo.x}</div>
            <div>y: {debugInfo.y}</div>
            <div>z: {debugInfo.z}</div>
            <div>polygonId: {debugInfo.polygonId}</div>
            <div>thickness: {thicknessValues[debugInfo.polygonId]} mm</div>
            <div>Log Value: {(Math.log(thicknessValues[debugInfo.polygonId]+1) - Math.log(minThickness + 1)) / (Math.log(maxThickness + 1) - Math.log(minThickness + 1))} </div>
          </div>}
          <div style={{ position: 'fixed', top: 10, left: 10 }}>
            <form onSubmit={handleFormSubmit}>
              <div>
                <label htmlFor="STL">STL:</label>
                <input type="file" id="STL" accept=".stl" onChange={handleStlFileChange} />
              </div>
              <div>
                <label htmlFor="thickness_txt">TXT:</label>
                <input type="file" id="thickness_txt" accept=".txt" onChange={handleTxtFileChange} />
              </div>
              <button type="submit" style={{ marginTop: '10px' }}>Submit</button>
            </form>
          </div>
          <div style={{ position: 'fixed', bottom: 20, right: 150}}>
            <form onSubmit={handleBoundSubmit}>
              <div>
                {/* <label htmlFor="boundValue">Bound:</label> */}
                <input
                  type="number"
                  id="boundValue"
                  value={tempBound}
                  onChange={(e) => setTempBound(e.target.value)} // Update tempBound on change
                  step='0.000001' // Allows values like 0.05
                  min='0.000001'
                  max={maxThickness}
                />
              </div>
              <button type="submit" style={{ marginTop: '10px' }}>Update Bound</button>
            </form>
          </div>
    </div>
  );
}

// Function to parse hex color to RGB
function parseHexColor(hex) {
  hex = hex.replace(/^#/, '');
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

export default App;
