import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createOffice(container, teams, onSelect) {
 const scene=new THREE.Scene();scene.background=new THREE.Color('#152923');
 const camera=new THREE.PerspectiveCamera(34,1,.1,200);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 container.prepend(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;
 controls.minDistance=24;controls.maxDistance=120;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=.30;
 const ambient=new THREE.HemisphereLight(0xf0f5da,0x354d35,2.4);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffefcd,3.2);sun.position.set(-12,26,14);sun.castShadow=true;
 sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-27;sun.shadow.camera.right=27;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;sun.shadow.normalBias=.05;scene.add(sun);
 const fill=new THREE.DirectionalLight(0x9fc3d0,1.1);fill.position.set(14,12,-15);scene.add(fill);
 const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
 const palette={base:mat('#53644b'),tile:mat('#c7c7a9'),wall:mat('#d5d6ba'),dark:mat('#263e33'),wood:mat('#bda582'),leg:mat('#536b54'),screen:mat('#162d2a'),skin:mat('#f6cf59'),hair:mat('#3e3b2d'),black:mat('#28352b'),pot:mat('#aa9877'),leaf:mat('#607d46')};
 const boxGeo=new THREE.BoxGeometry(1,1,1),cylGeo=new THREE.CylinderGeometry(1,1,1,14);
 function box(parent,x,y,z,w,h,d,material,shadow=true){const mesh=new THREE.Mesh(boxGeo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 function cylinder(parent,x,y,z,r,h,material){const mesh=new THREE.Mesh(cylGeo,material);mesh.position.set(x,y,z);mesh.scale.set(r,h,r);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
 box(scene,0,-.8,0,36,1.1,23,palette.base);box(scene,0,-.19,0,35.5,.16,22.5,palette.tile);
 // Exposed studs give the campus the character of a construction-block model.
 for(let x=-16.6;x<17;x+=1.15)for(let z=-10.35;z<11;z+=1.15)cylinder(scene,x,-.065,z,.17,.10,palette.tile);
 box(scene,0,-1.45,0,39,.22,26,mat('#0f241a'),false);
 box(scene,0,1.2,-11.3,35.5,2.8,.35,palette.wall);box(scene,-17.6,.7,0,.35,1.8,22.5,palette.wall);
 const walkers=[],roomTargets={},labels=[];let selected='research',animated=true,active=false;
 const config=[[-11.3,-5.5],[0,-5.5],[11.3,-5.5],[-11.3,5.1],[0,5.1],[11.3,5.1]];
 const icons=['⌕','◫','◇','⌘','◷','↗'];
 function plant(x,z){cylinder(scene,x,.34,z,.34,.65,palette.pot);box(scene,x,.82,z,.09,.65,.09,palette.leg);for(let i=0;i<4;i++){const leaf=box(scene,x+Math.cos(i*1.6)*.2,1.02+i*.09,z+Math.sin(i*1.6)*.2,.55,.14,.25,palette.leaf);leaf.rotation.z=(i%2?.5:-.5);leaf.rotation.y=i*1.6}}
 function monitor(parent,x,z,teamMat){box(parent,x,1.29,z,.10,.28,.12,palette.dark);box(parent,x,1.52,z,.8,.48,.09,palette.dark);box(parent,x,1.53,z+.05,.69,.35,.025,palette.screen);for(let i=0;i<4;i++)box(parent,x-.23+i*.14,1.45+Math.sin(i+1)*.06,z+.068,.055,.12+(i%2)*.09,.01,teamMat,false);box(parent,x,1.11,z+.35,.55,.025,.19,palette.dark)}
 function figure(parent,x,z,color,index){const group=new THREE.Group();group.position.set(x,0,z);parent.add(group);
 const outfit=mat(color),trouser=palette.dark;
 box(group,-.13,.36,0,.21,.53,.23,trouser);box(group,.13,.36,0,.21,.53,.23,trouser);
 box(group,-.13,.11,.08,.24,.16,.37,palette.black);box(group,.13,.11,.08,.24,.16,.37,palette.black);
 box(group,0,.85,0,.61,.59,.34,outfit);box(group,0,.96,.18,.045,.27,.014,palette.wall,false);
 const arms=[];[-1,1].forEach(side=>{const arm=new THREE.Group();arm.position.set(side*.39,1.02,0);group.add(arm);box(arm,0,-.15,0,.19,.40,.23,outfit);cylinder(arm,0,-.4,0,.115,.16,palette.skin);arms.push(arm)});
 cylinder(group,0,1.44,0,.245,.43,palette.skin);cylinder(group,0,1.69,0,.11,.10,palette.skin);
 // Eyes and smile are real geometry on the minifigure's face.
 box(group,-.085,1.48,.231,.045,.055,.02,palette.black,false);box(group,.085,1.48,.231,.045,.055,.02,palette.black,false);box(group,0,1.36,.235,.11,.025,.015,palette.black,false);
 if(index%3===0){cylinder(group,0,1.65,0,.26,.11,palette.hair)}
 walkers.push({group,arms,baseX:x,baseZ:z,phase:index*2.17,walk:index%4===0,team:parent.userData.teamId});
 }
 teams.forEach((team,i)=>{
  const [x,z]=config[i],room=new THREE.Group();room.position.set(x,0,z);room.userData.teamId=team.id;scene.add(room);roomTargets[team.id]=new THREE.Vector3(x,.2,z);
  const color=new THREE.Color(team.color),floorMat=mat(color.clone().lerp(new THREE.Color('#8e9c78'),.60));
  const floor=box(room,0,-.01,0,10.6,.18,9.3,floorMat);floor.userData.roomFloor=team.id;
  box(room,0,.21,-4.47,10.6,.44,.22,palette.wall);box(room,-5.18,.21,0,.22,.44,8.9,palette.wall);
  for(let j=0;j<9;j++)cylinder(room,-4.8+j*1.17,.47,-4.47,.14,.08,palette.wall);
  const cols=team.count>7?4:team.count>3?3:3;
  const rows=Math.ceil(team.count/cols);
  const spacing=team.count>7?2.3:3.0;
  const deskMat=mat('#d4b68d'),accent=mat(team.color);
  for(let j=0;j<team.count;j++){
   const col=j%cols,row=Math.floor(j/cols),dx=(col-(cols-1)/2)*spacing,dz=(row-(rows-1)/2)*2.45+.2;
   box(room,dx,.93,dz,1.75,.16,.90,deskMat);box(room,dx-.65,.43,dz,.10,.87,.12,palette.leg);box(room,dx+.65,.43,dz,.10,.87,.12,palette.leg);
   monitor(room,dx,dz-.15,accent);
   box(room,dx,.48,dz+1.03,.64,.13,.65,palette.dark);box(room,dx,.81,dz+1.28,.66,.63,.11,palette.dark);
   figure(room,dx,dz+.82,team.color,j+i*12);
  }
  // Front plaque, entrance lights and a small transparent block divider.
  box(room,0,.23,4.45,3.6,.3,.20,accent);cylinder(room,-4.55,.15,3.75,.17,.25,accent);
  const button=document.createElement('button');button.className='room-label';button.style.setProperty('--room-color',team.color);button.setAttribute('aria-label',`${team.name}, ${team.count} agentes`);
  const dot=document.createElement('span');dot.className='label-dot';button.append(dot,document.createTextNode(`${team.name.toUpperCase()} · ${team.count}`));button.onclick=()=>{select(team.id);onSelect(team.id)};
  document.getElementById('room-labels').append(button);labels.push({button,position:new THREE.Vector3(x,.65,z+4.7),teamId:team.id});
 });
 plant(-16.5,-9.8);plant(16.2,-9.8);plant(-16.3,9.5);plant(16,9.5);
 // Central path with inset floor lighting.
 const lightMat=new THREE.MeshBasicMaterial({color:'#d6e8b7'});
 for(let x=-15;x<=15;x+=3)box(scene,x,.02,-.25,1.2,.045,.13,lightMat,false);
 let pointerDown=null;
 renderer.domElement.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY}});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!pointerDown||Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>6)return;
  const rect=renderer.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(scene.children,true)[0];
  if(hit){let target=hit.object;while(target&&!target.userData.teamId)target=target.parent;if(target){select(target.userData.teamId);onSelect(target.userData.teamId)}}
 });
 function select(id){selected=id;labels.forEach(l=>l.button.style.borderColor=l.teamId===id?'#d2e3a6':'#6b7d5e')}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
 const observer=new ResizeObserver(resize);observer.observe(container);
 function home(){controls.target.set(0,0,0);camera.position.set(31,35,40);if(container.clientWidth<500)camera.position.multiplyScalar(Math.max(1.35,1.25/camera.aspect));controls.update()}
 resize();home();select(selected);
 const clock=new THREE.Clock();let frameId;
 function animate(){frameId=requestAnimationFrame(animate);const t=clock.getElapsedTime();
  walkers.forEach(w=>{const moving=animated;const speed=active?2.2:.7;w.group.position.y=moving?Math.sin(t*speed*2+w.phase)*.018:0;w.arms.forEach((a,i)=>{a.rotation.x=moving?-.4+Math.sin(t*speed+w.phase+i*1.4)*.22:0});if(w.walk&&moving){w.group.position.x=w.baseX+Math.sin(t*.35+w.phase)*.11;w.group.rotation.y=Math.sin(t*.25+w.phase)*.13}else w.group.position.x=w.baseX;});
  controls.update();renderer.render(scene,camera);
  labels.forEach(l=>{const p=l.position.clone().project(camera);l.button.style.left=`${(p.x*.5+.5)*container.clientWidth}px`;l.button.style.top=`${(-p.y*.5+.5)*container.clientHeight}px`;l.button.hidden=p.z>1||p.z< -1;});
 }
 animate();document.getElementById('scene-loading').hidden=true;
 return {home,select,zoom(direction){const delta=camera.position.clone().sub(controls.target);delta.multiplyScalar(direction>0?.87:1.15);delta.clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(delta);controls.update()},setAnimated(value){animated=value},setActive(value){active=value},agentCount:walkers.length,dispose(){cancelAnimationFrame(frameId);observer.disconnect();controls.dispose();renderer.dispose();renderer.domElement.remove()}};
}
