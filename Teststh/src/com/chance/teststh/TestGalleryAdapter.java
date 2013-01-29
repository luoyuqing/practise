package com.chance.teststh;

import android.content.Context;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.ImageView;

public class TestGalleryAdapter extends BaseAdapter {

	private int[] data = null;
	private Context context = null;
	public TestGalleryAdapter(Context context,int[] data){
		this.data = data;
		this.context = context;
	}
	@Override
	public int getCount() {
		// TODO Auto-generated method stub
		return data.length;
	}

	@Override
	public Object getItem(int position) {
		// TODO Auto-generated method stub
		return data[position];
	}

	@Override
	public long getItemId(int position) {
		// TODO Auto-generated method stub
		return position;
	}

	@Override
	public View getView(int position, View convertView, ViewGroup parent) {
		// TODO Auto-generated method stub
		if(convertView == null){
			ImageView i = new ImageView(context);
			i.setImageResource(data[position]);
			return i;
		}else{
			((ImageView)convertView).setImageResource(data[position]);
			return convertView;
		}
	}

}
