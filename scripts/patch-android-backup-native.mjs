import {readFile,writeFile} from 'node:fs/promises';
const dir='android/app/src/main/java/ir/fireexecutive/pro';
const java=`package ir.fireexecutive.pro;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;
import java.util.GregorianCalendar;
import org.json.JSONObject;

@CapacitorPlugin(name = "FepBackup")
public class FepBackupPlugin extends Plugin {
 @PluginMethod public void saveJson(PluginCall call){
  String name=call.getString("fileName","Fire-Executive-Pro-Backup.json");
  String content=call.getString("content");
  if(content==null||content.isEmpty()){call.reject("backup_content_missing");return;}
  if(Build.VERSION.SDK_INT<Build.VERSION_CODES.Q){call.reject("android_version_unsupported_for_direct_backup");return;}
  byte[] bytes=content.getBytes(StandardCharsets.UTF_8);
  ContentResolver resolver=getContext().getContentResolver();
  ContentValues values=new ContentValues();
  values.put(MediaStore.Downloads.DISPLAY_NAME,name);
  values.put(MediaStore.Downloads.MIME_TYPE,"application/json");
  values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/FireExecutivePro");
  values.put(MediaStore.Downloads.IS_PENDING,1);
  Uri uri=null;
  try{
   uri=resolver.insert(MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY),values);
   if(uri==null)throw new IllegalStateException("backup_create_failed");
   try(OutputStream out=resolver.openOutputStream(uri,"w")){
    if(out==null)throw new IllegalStateException("backup_output_unavailable");
    out.write(bytes);
    out.flush();
   }
   long size=readbackSize(resolver,uri);
   if(size!=bytes.length)throw new IllegalStateException("backup_readback_size_mismatch");
   ContentValues publish=new ContentValues();
   publish.put(MediaStore.Downloads.IS_PENDING,0);
   resolver.update(uri,publish,null,null);
   JSObject r=new JSObject();
   r.put("saved",true);
   r.put("verified",true);
   r.put("bytes",size);
   r.put("fileName",name);
   r.put("path","Downloads/FireExecutivePro/"+name);
   call.resolve(r);
  }catch(Exception ex){
   if(uri!=null){try{resolver.delete(uri,null,null);}catch(Exception ignored){}}
   call.reject("backup_write_or_verify_failed",ex);
  }
 }
 @PluginMethod public void saveAutoJson(PluginCall call){
  String content=call.getString("content");
  String mode=call.getString("mode","auto");
  if(!("auto".equals(mode)||"daily".equals(mode)||"weekly".equals(mode)))mode="auto";
  boolean writeDaily="auto".equals(mode)||"daily".equals(mode);
  boolean writeWeekly="auto".equals(mode)||"weekly".equals(mode);
  if(content==null||content.isEmpty()){call.reject("auto_backup_content_missing");return;}
  try{
   byte[] bytes=content.getBytes(StandardCharsets.UTF_8);
   File dir=new File(getContext().getFilesDir(),"fep-auto-backup");
   if(!dir.exists()&&!dir.mkdirs())throw new IllegalStateException("auto_backup_dir_failed");
   File tmp=new File(dir,"auto-latest.tmp");
   File latest=new File(dir,"auto-latest.json");
   File previous=new File(dir,"auto-previous.json");
   try(FileOutputStream out=new FileOutputStream(tmp,false)){out.write(bytes);out.flush();out.getFD().sync();}
   if(tmp.length()!=bytes.length)throw new IllegalStateException("auto_backup_temp_size_mismatch");
   if(previous.exists()&&!previous.delete())throw new IllegalStateException("auto_backup_previous_delete_failed");
   if(latest.exists()&&!latest.renameTo(previous))throw new IllegalStateException("auto_backup_rotate_failed");
   if(!tmp.renameTo(latest)){if(previous.exists())previous.renameTo(latest);throw new IllegalStateException("auto_backup_commit_failed");}
   long verified=readPrivateSize(latest);
   if(verified!=bytes.length)throw new IllegalStateException("auto_backup_readback_size_mismatch");
   File dailyDir=new File(dir,"daily");
   File weeklyDir=new File(dir,"weekly");
   GregorianCalendar cal=new GregorianCalendar();
   if(writeDaily){
    if(!dailyDir.exists()&&!dailyDir.mkdirs())throw new IllegalStateException("daily_backup_dir_failed");
    String dailyName=safeSnapshotName(call.getString("dailyFileName"),String.format(java.util.Locale.US,"Daily-%04d-%02d-%02d.json",cal.get(GregorianCalendar.YEAR),cal.get(GregorianCalendar.MONTH)+1,cal.get(GregorianCalendar.DAY_OF_MONTH)));
    File legacyDaily=new File(dailyDir,String.format(java.util.Locale.US,"daily-%04d%02d%02d.json",cal.get(GregorianCalendar.YEAR),cal.get(GregorianCalendar.MONTH)+1,cal.get(GregorianCalendar.DAY_OF_MONTH)));
    if(legacyDaily.exists())legacyDaily.delete();
    writePrivateAtomic(new File(dailyDir,dailyName),bytes);
    pruneSnapshots(dailyDir,7);
   }
   if(writeWeekly){
    if(!weeklyDir.exists()&&!weeklyDir.mkdirs())throw new IllegalStateException("weekly_backup_dir_failed");
    String weeklyName=safeSnapshotName(call.getString("weeklyFileName"),String.format(java.util.Locale.US,"Weekly-%04d-%02d-%02d.json",cal.get(GregorianCalendar.YEAR),cal.get(GregorianCalendar.MONTH)+1,cal.get(GregorianCalendar.DAY_OF_MONTH)));
    File currentWeek=findCurrentWeekSnapshot(weeklyDir);
    if(currentWeek!=null&&!currentWeek.getName().equals(weeklyName))currentWeek.delete();
    writePrivateAtomic(new File(weeklyDir,weeklyName),bytes);
    pruneSnapshots(weeklyDir,4);
   }
   JSObject r=new JSObject();r.put("saved",true);r.put("verified",true);r.put("bytes",verified);r.put("modifiedAt",latest.lastModified());r.put("storage","internal-private");r.put("mode",mode);r.put("dailyCount",countSnapshots(dailyDir));r.put("weeklyCount",countSnapshots(weeklyDir));call.resolve(r);
  }catch(Exception ex){call.reject("auto_backup_save_failed",ex);}
 }
 @PluginMethod public void loadAutoJson(PluginCall call){
  try{
   File root=new File(getContext().getFilesDir(),"fep-auto-backup");
   File latest=new File(root,"auto-latest.json"),previous=new File(root,"auto-previous.json");
   File selected=isBackupJsonUsable(latest)?latest:(isBackupJsonUsable(previous)?previous:null);
   if(selected==null){JSObject r=new JSObject();r.put("found",false);call.resolve(r);return;}
   String content=readPrivateUtf8(selected);
   JSObject r=new JSObject();r.put("found",true);r.put("content",content);r.put("bytes",selected.length());r.put("modifiedAt",selected.lastModified());r.put("storage","internal-private");r.put("source",selected.getName());r.put("recoveredFromPrevious",selected.equals(previous));call.resolve(r);
  }catch(Exception ex){call.reject("auto_backup_load_failed",ex);}
 }
 @PluginMethod public void getAutoInfo(PluginCall call){
  File root=new File(getContext().getFilesDir(),"fep-auto-backup");
  File latest=new File(root,"auto-latest.json"),previous=new File(root,"auto-previous.json");
  File selected=isBackupJsonUsable(latest)?latest:(isBackupJsonUsable(previous)?previous:null);
  File dailyDir=new File(root,"daily");
  File weeklyDir=new File(root,"weekly");
  JSObject r=new JSObject();r.put("exists",selected!=null);r.put("bytes",selected!=null?selected.length():0);r.put("modifiedAt",selected!=null?selected.lastModified():0);r.put("storage","internal-private");r.put("source",selected!=null?selected.getName():"");r.put("recoveredFromPrevious",selected!=null&&selected.equals(previous));r.put("dailyCount",countSnapshots(dailyDir));r.put("weeklyCount",countSnapshots(weeklyDir));r.put("dailyLimit",7);r.put("weeklyLimit",4);r.put("dailyCurrent",hasSnapshotToday(dailyDir));r.put("weeklyCurrent",findCurrentWeekSnapshot(weeklyDir)!=null);call.resolve(r);
 }
 @PluginMethod public void savePreRestoreJson(PluginCall call){
  String content=call.getString("content");
  if(content==null||content.isEmpty()){call.reject("pre_restore_content_missing");return;}
  try{
   byte[] bytes=content.getBytes(StandardCharsets.UTF_8);
   File root=new File(getContext().getFilesDir(),"fep-auto-backup");
   if(!root.exists()&&!root.mkdirs())throw new IllegalStateException("pre_restore_dir_failed");
   File target=new File(root,"pre-restore-latest.json");
   writePrivateAtomic(target,bytes);
   JSObject r=new JSObject();r.put("saved",true);r.put("verified",true);r.put("bytes",target.length());r.put("modifiedAt",target.lastModified());r.put("storage","internal-private");call.resolve(r);
  }catch(Exception ex){call.reject("pre_restore_save_failed",ex);}
 }
 @PluginMethod public void loadPreRestoreJson(PluginCall call){
  try{
   File target=new File(new File(getContext().getFilesDir(),"fep-auto-backup"),"pre-restore-latest.json");
   if(!target.exists()||target.length()<=0){JSObject r=new JSObject();r.put("found",false);call.resolve(r);return;}
   JSObject r=new JSObject();r.put("found",true);r.put("content",readPrivateUtf8(target));r.put("bytes",target.length());r.put("modifiedAt",target.lastModified());r.put("storage","internal-private");call.resolve(r);
  }catch(Exception ex){call.reject("pre_restore_load_failed",ex);}
 }
 @PluginMethod public void getPreRestoreInfo(PluginCall call){
  File target=new File(new File(getContext().getFilesDir(),"fep-auto-backup"),"pre-restore-latest.json");
  JSObject r=new JSObject();r.put("exists",target.exists()&&target.length()>0);r.put("bytes",target.exists()?target.length():0);r.put("modifiedAt",target.exists()?target.lastModified():0);r.put("storage","internal-private");call.resolve(r);
 }
 @PluginMethod public void listSnapshots(PluginCall call){
  try{
   File root=new File(getContext().getFilesDir(),"fep-auto-backup");
   JSArray items=new JSArray();
   appendSnapshots(items,new File(root,"daily"),"daily");
   appendSnapshots(items,new File(root,"weekly"),"weekly");
   JSObject r=new JSObject();r.put("items",items);call.resolve(r);
  }catch(Exception ex){call.reject("snapshot_list_failed",ex);}
 }
 @PluginMethod public void loadSnapshotJson(PluginCall call){
  try{
   String type=call.getString("type","");
   String fileName=call.getString("fileName","");
   if(!("daily".equals(type)||"weekly".equals(type)))throw new IllegalArgumentException("snapshot_type_invalid");
   if(fileName==null||fileName.isEmpty()||fileName.contains("/")||fileName.indexOf((char)92)>=0||!fileName.endsWith(".json"))throw new IllegalArgumentException("snapshot_name_invalid");
   File root=new File(getContext().getFilesDir(),"fep-auto-backup");
   File f=new File(new File(root,type),fileName);
   if(!f.exists()||f.length()<=0){JSObject r=new JSObject();r.put("found",false);call.resolve(r);return;}
   JSObject r=new JSObject();r.put("found",true);r.put("content",readPrivateUtf8(f));r.put("bytes",f.length());r.put("modifiedAt",f.lastModified());r.put("fileName",f.getName());r.put("type",type);call.resolve(r);
  }catch(Exception ex){call.reject("snapshot_load_failed",ex);}
 }
 private String safeSnapshotName(String supplied,String fallback){
  String s=supplied==null?"":supplied.trim();
  if(s.isEmpty()||s.contains("/")||s.indexOf((char)92)>=0||!s.endsWith(".json")||!s.matches("^[A-Za-z0-9._-]+$"))return fallback;
  return s;
 }
 private boolean hasSnapshotToday(File dir){
  File[] files=dir.listFiles((d,name)->name.endsWith(".json"));if(files==null)return false;
  GregorianCalendar now=new GregorianCalendar();
  for(File f:files){GregorianCalendar c=new GregorianCalendar();c.setTimeInMillis(f.lastModified());if(c.get(GregorianCalendar.YEAR)==now.get(GregorianCalendar.YEAR)&&c.get(GregorianCalendar.DAY_OF_YEAR)==now.get(GregorianCalendar.DAY_OF_YEAR))return true;}
  return false;
 }
 private File findCurrentWeekSnapshot(File dir){
  File[] files=dir.listFiles((d,name)->name.endsWith(".json"));if(files==null)return null;
  GregorianCalendar now=new GregorianCalendar();
  for(File f:files){GregorianCalendar c=new GregorianCalendar();c.setTimeInMillis(f.lastModified());if(c.get(GregorianCalendar.YEAR)==now.get(GregorianCalendar.YEAR)&&c.get(GregorianCalendar.WEEK_OF_YEAR)==now.get(GregorianCalendar.WEEK_OF_YEAR))return f;}
  return null;
 }
 private void appendSnapshots(JSArray out,File dir,String type){
  File[] files=dir.listFiles((d,name)->name.endsWith(".json"));if(files==null)return;
  Arrays.sort(files,(a,b)->Long.compare(b.lastModified(),a.lastModified()));
  for(File f:files){JSObject o=new JSObject();o.put("type",type);o.put("fileName",f.getName());o.put("bytes",f.length());o.put("modifiedAt",f.lastModified());out.put(o);}
 }
 private int countSnapshots(File dir){File[] files=dir.listFiles((d,name)->name.endsWith(".json"));return files==null?0:files.length;}
 private void writePrivateAtomic(File target,byte[] bytes)throws Exception{
  File tmp=new File(target.getParentFile(),target.getName()+".tmp");
  try(FileOutputStream out=new FileOutputStream(tmp,false)){out.write(bytes);out.flush();out.getFD().sync();}
  if(tmp.length()!=bytes.length)throw new IllegalStateException("snapshot_size_mismatch");
  if(target.exists()&&!target.delete())throw new IllegalStateException("snapshot_replace_failed");
  if(!tmp.renameTo(target))throw new IllegalStateException("snapshot_commit_failed");
  if(readPrivateSize(target)!=bytes.length)throw new IllegalStateException("snapshot_readback_size_mismatch");
 }
 private void pruneSnapshots(File dir,int keep){
  File[] files=dir.listFiles((d,name)->name.endsWith(".json"));
  if(files==null||files.length<=keep)return;
  Arrays.sort(files,(a,b)->Long.compare(b.lastModified(),a.lastModified()));
  for(int i=keep;i<files.length;i++){try{files[i].delete();}catch(Exception ignored){}}
 }
 private boolean isBackupJsonUsable(File file){
  try{
   if(file==null||!file.exists()||file.length()<=0)return false;
   String content=readPrivateUtf8(file);
   JSONObject obj=new JSONObject(content);
   if(!"fire-executive-pro-backup".equals(obj.optString("format"))||obj.optInt("version",-1)!=1)return false;
   JSONObject local=obj.optJSONObject("localStorage"),indexed=obj.optJSONObject("indexedDB");
   if(local==null||indexed==null||indexed.optJSONObject("stores")==null)return false;
   return isProjectStateUsable(projectStateFromBackup(local,indexed));
  }catch(Exception ex){return false;}
 }
 private JSONObject projectStateFromBackup(JSONObject local,JSONObject indexed){
  try{
   String raw=local.optString("fireExecState_v2","");
   if(!raw.isEmpty())return new JSONObject(raw);
  }catch(Exception ignored){}
  try{
   JSONObject stores=indexed.optJSONObject("stores"),kv=stores!=null?stores.optJSONObject("kv"):null;
   org.json.JSONArray entries=kv!=null?kv.optJSONArray("entries"):null;
   if(entries!=null){for(int i=0;i<entries.length();i++){
    JSONObject e=entries.optJSONObject(i);if(e==null||!"state".equals(String.valueOf(e.opt("key"))))continue;
    Object value=e.opt("value");if(value instanceof JSONObject)return (JSONObject)value;if(value instanceof String)return new JSONObject((String)value);
   }}
  }catch(Exception ignored){}
  return null;
 }
 private boolean isProjectStateUsable(JSONObject state){
  try{
   if(state==null)return false;
   org.json.JSONArray projects=state.optJSONArray("projects");JSONObject data=state.optJSONObject("data");String active=state.optString("activeId","");
   if(projects==null||projects.length()==0||data==null||active.isEmpty())return false;
   java.util.HashSet<String> ids=new java.util.HashSet<>();boolean activeFound=false;
   for(int i=0;i<projects.length();i++){
    JSONObject p=projects.optJSONObject(i);String id=p!=null?p.optString("id",""):"";if(id.isEmpty()||!ids.add(id))return false;if(id.equals(active))activeFound=true;
    JSONObject d=data.optJSONObject(id);if(d==null)return false;
    if(d.has("hydraulicNetwork")&&!d.isNull("hydraulicNetwork")){JSONObject net=d.optJSONObject("hydraulicNetwork");if(net==null)return false;if(net.has("nodes")&&!net.isNull("nodes")&&net.optJSONArray("nodes")==null)return false;if(net.has("pipes")&&!net.isNull("pipes")&&net.optJSONArray("pipes")==null)return false;}
    if(d.has("systemEquipment")&&!d.isNull("systemEquipment")&&d.optJSONArray("systemEquipment")==null)return false;
    if(d.has("topologyConnections")&&!d.isNull("topologyConnections")&&d.optJSONArray("topologyConnections")==null)return false;
    String[] scoped={"hydraulicBranchAnalysis","pumpDesignPoint","pumpCandidate"};for(String k:scoped){JSONObject snap=d.optJSONObject(k);if(snap!=null&&!snap.isNull("projectId")&&!id.equals(String.valueOf(snap.opt("projectId"))))return false;}
   }
   return activeFound;
  }catch(Exception ex){return false;}
 }
 private long readPrivateSize(File file)throws Exception{long total=0;try(InputStream in=new FileInputStream(file)){byte[] b=new byte[16384];int c;while((c=in.read(b))!=-1)total+=c;}return total;}
 private String readPrivateUtf8(File file)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=new FileInputStream(file)){byte[] b=new byte[16384];int c;while((c=in.read(b))!=-1)out.write(b,0,c);}return out.toString(StandardCharsets.UTF_8.name());}
 private long readbackSize(ContentResolver resolver,Uri uri)throws Exception{
  long total=0;
  try(InputStream in=resolver.openInputStream(uri)){
   if(in==null)throw new IllegalStateException("backup_readback_unavailable");
   byte[] b=new byte[16384];int n;
   while((n=in.read(b))!=-1)total+=n;
  }
  if(total<=0)throw new IllegalStateException("backup_file_empty_after_write");
  return total;
 }
}`;
await writeFile(`${dir}/FepBackupPlugin.java`,java,'utf8');
const p=`${dir}/MainActivity.java`;let s=await readFile(p,'utf8');
if(!s.includes('registerPlugin(FepBackupPlugin.class);'))s=s.replace('registerPlugin(FepPrintPlugin.class);','registerPlugin(FepPrintPlugin.class);\n        registerPlugin(FepBackupPlugin.class);');
if(!s.includes('registerPlugin(FepBackupPlugin.class);'))throw new Error('Could not register FepBackupPlugin');
await writeFile(p,s,'utf8');console.log('Native backup registered with direct Downloads MediaStore save and readback verification.');
