package com.chance.teststh;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.BaseAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;


//日记中图片所用Adapter
public class GalleryAdapter extends BaseAdapter
{
	Context m_Context;
	ArrayList<String> m_ImagePath;//装载相册中所有图片的路径
	int type;
	LayoutInflater mInflater ;
    holder mHolder ; 
    String LOG_TAG="GalleryAdapter";
    Map<String,String> map;
    HashMap<Integer, Integer> isFlag = new HashMap<Integer, Integer>();
	public GalleryAdapter(Context context,ArrayList<String> imagepath,int type,Map<String, String> map )
	{
	   Log.d("galleryadapter","galleryadapter construct");
	   this.mInflater = LayoutInflater.from(context);
	   this.m_Context = context;
	   this.m_ImagePath = imagepath;
	   Log.d("galleryadapter","image path is==>"+imagepath);
	   this.type = type;
	   this.map = map;
	}
	
	public void setMap(Map<String, String> map)
	{
		this.map = map;
	}
	
	@Override
	public int getCount()
	{
		return m_ImagePath.size();
	}
	@Override
	public Object getItem(int position)
	{
		return m_ImagePath.get(position);
	}
	@Override
	public long getItemId(int position)
	{		
		return position;
	}
	
	public class holder
	{
		public LinearLayout layout;
		public ImageView image;
	}
	
	//设置所要显示的相关属性
	public View getView(int position,View convertView,ViewGroup parent)
	{  
		Log.d("galleryadapter","galleryadapter getview");
        if(convertView == null)
        {
        	convertView= mInflater.inflate(R.layout.item_gallery, null);		
        	mHolder = new holder();
			mHolder.image = (ImageView)convertView.findViewById(R.id.item_gallery_imageview);
			convertView.setTag(mHolder);
        }
        else
        {
        	mHolder = (holder)convertView.getTag();
        }
        
//                ReturnState state = new ReturnState();
//        	    long time = System.currentTimeMillis();
				Bitmap bitmap=null;
				Log.d("galleryadapter", "position:"+position);
				Log.d(LOG_TAG, "m_ImagePath size():"+m_ImagePath.size());
                    /*if(OtherDiaryActivity.picCache.get(m_ImagePath.get(position))==null)
                    {
                    	Log.d("galleryadapter","pic not exist");
                    		try
                            {
								state = BaseActivity.mRemoteService.CCIrecvFileFromFastDFS(ProtocolConstant.PICSERV_URL, m_ImagePath.get(position), "/sdcard", time + ".jpg");
							} 
                    		catch (RemoteException e)
							{
								// TODO Auto-generated catch block
								e.printStackTrace();
							}
	        	        if(state.getCode() == 0)
	        	        {
	                        Log.d("galleryadapter","pic has down"+state.getMessage());
	        				BitmapFactory.Options opts = new BitmapFactory.Options();
	        		 		opts.inJustDecodeBounds = true;
	        		 		BitmapFactory.decodeFile(state.getMessage(), opts);		 
	        		 		WindowManager mWMgr = (WindowManager) m_Context.getSystemService(m_Context.WINDOW_SERVICE);
	        				int width = mWMgr.getDefaultDisplay().getWidth();
	        				int height = mWMgr.getDefaultDisplay().getHeight();
	        				int maxheight,maxwidth;
	        				if(type==DiaryConstants.EDITPICTYPE)
	        				{
	        					 maxheight=0;
	        					 maxwidth =width/5;
	        				}
	        				else
	        				{
	        					 maxheight=0;
	        					 maxwidth =width;
	        				}
	        		 		if(opts.outHeight!=0&&opts.outWidth!=0)
	        		 		{
	        			 		 maxheight= maxwidth * opts.outHeight/opts.outWidth;
	        			 		 opts.inSampleSize = DiaryMethod.computeSampleSize(opts, -1, maxwidth*maxheight); 
	        		 		}
	        		 		opts.inJustDecodeBounds = false;
	
	        		 		bitmap = BitmapFactory.decodeFile(state.getMessage(),opts);
	        	        	OtherDiaryActivity.picCache.put(m_ImagePath.get(position), bitmap);
	        	        	Log.d(LOG_TAG, "load up:"+m_ImagePath.get(position));
	        	        }
                    }
                    else 
                    {
                    	Log.d("galleryadapter","pic  exist");
                    	bitmap = OtherDiaryActivity.picCache.get(m_ImagePath.get(position));
					}*/
				String path = null;
				if(map.size()>0)
				{
				   path  = map.get(m_ImagePath.get(position));
				   Log.d("galleryadapter","path:"+ path);
				}
				if(path!=null)
				{
//					BitmapFactory.Options opts = new BitmapFactory.Options();
//    		 		opts.inJustDecodeBounds = true;
//    		 		BitmapFactory.decodeFile(path, opts);		 
//    		 		WindowManager mWMgr = (WindowManager) m_Context.getSystemService(m_Context.WINDOW_SERVICE);
//    				int width = mWMgr.getDefaultDisplay().getWidth();
//    				int height = mWMgr.getDefaultDisplay().getHeight();
//    				int maxheight,maxwidth;
//    				if(type==DiaryConstants.EDITPICTYPE)
//    				{
//    					 maxheight=0;
//    					 maxwidth =width/5;
//    				}
//    				else
//    				{
//    					 maxheight=0;
//    					 maxwidth =width;
//    				}
//    		 		if(opts.outHeight!=0&&opts.outWidth!=0)
//    		 		{
//    			 		 maxheight= maxwidth * opts.outHeight/opts.outWidth;
//    			 		 opts.inSampleSize = DiaryMethod.computeSampleSize(opts, -1, maxwidth*maxheight); 
//    		 		}
//    		 		opts.inJustDecodeBounds = false;
//    		 		bitmap = BitmapFactory.decodeFile(path,opts);
				//	bitmap = BitmapFactory.decodeFile(path);
					try {
						InputStream is = m_Context.getAssets().open(path);
						bitmap = BitmapFactory.decodeStream(is);
					} catch (IOException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
				else 
				{
					Log.d("galleryadapter","path is null");
				}
				if(bitmap!=null)
				{
				    Log.d("galleryadapter","bitmap is not null");
				    mHolder.image.setImageBitmap(bitmap);
				    bitmap = null;
//				    mHolder.image.setScaleType(ImageView.ScaleType.FIT_CENTER);
				}
				else
				{
				    Log.d("galleryadapter","bitmap is null");
				}
	        return convertView;
	}
}
